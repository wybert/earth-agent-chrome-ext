import {
  Geometry,
  Position,
  geoToMapPixel,
  projectPath,
  validateGeometry,
} from '../../lib/map/spatial';
import { GeeMapAdapter } from './gee-adapter';

export interface Annotation {
  id: string;
  geometry: Geometry;
  kind: 'shape' | 'arrow' | 'label';
  label: string;
  color: string;
}
const NS = 'http://www.w3.org/2000/svg';
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

/** An extension-owned SVG layer, separate from GEE's imagery canvas and native layers. */
export class MapOverlay {
  readonly annotations = new Map<string, Annotation>();
  private host: HTMLDivElement;
  private svg: SVGSVGElement;
  private interval: ReturnType<typeof setInterval>;

  constructor(readonly adapter: GeeMapAdapter) {
    this.host = document.createElement('div');
    this.host.dataset.earthAgentMap = adapter.readView().mapId;
    Object.assign(this.host.style, {
      position: 'fixed',
      zIndex: '10000',
      pointerEvents: 'none',
      overflow: 'hidden',
    });
    const root = this.host.attachShadow({ mode: 'open' });
    this.svg = document.createElementNS(NS, 'svg');
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    Object.assign(this.svg.style, { position: 'absolute', inset: '0', pointerEvents: 'none' });
    root.append(this.svg);
    document.body.append(this.host);
    this.interval = setInterval(() => this.render(), 200);
    this.render();
  }

  upsert(annotation: Annotation) {
    validateGeometry(annotation.geometry);
    const geometry = annotation.geometry;
    const positions =
      geometry.type === 'Point'
        ? [geometry.coordinates]
        : geometry.type === 'LineString'
          ? geometry.coordinates
          : geometry.coordinates.flat();
    const view = this.adapter.readView();
    for (const position of positions) geoToMapPixel(view, position);
    if (!/^ea-[a-zA-Z0-9-]{1,100}$/.test(annotation.id))
      throw new Error(
        'Annotation IDs must start with ea- and contain only letters, digits and hyphens.'
      );
    if (!/^#[0-9a-fA-F]{6}$/.test(annotation.color))
      throw new Error('Color must be a #RRGGBB hex value.');
    if (annotation.label.length > 300) throw new Error('Label exceeds 300 characters.');
    if (!this.annotations.has(annotation.id) && this.annotations.size >= 100)
      throw new Error('Maximum 100 Agent annotations per map.');
    if (annotation.kind === 'arrow' && annotation.geometry.type !== 'LineString')
      throw new Error('Arrow annotations require LineString geometry.');
    this.annotations.set(annotation.id, clone(annotation));
    this.render();
    return clone(annotation);
  }

  remove(id?: string) {
    if (id) {
      if (!this.annotations.delete(id)) throw new Error('Unknown Agent annotation.');
    } else this.annotations.clear();
    this.render();
  }

  private draw(geometry: Geometry, color: string, label = '', arrow = false) {
    const view = this.adapter.readView();
    const project = (p: Position) => geoToMapPixel(view, p);
    let anchor: Position;
    if (geometry.type === 'Point') {
      anchor = geometry.coordinates;
      const p = project(anchor);
      const circle = document.createElementNS(NS, 'circle');
      circle.setAttribute('cx', String(p.x));
      circle.setAttribute('cy', String(p.y));
      circle.setAttribute('r', '6');
      circle.setAttribute('fill', color);
      this.svg.append(circle);
    } else {
      const rings = geometry.type === 'LineString' ? [geometry.coordinates] : geometry.coordinates;
      anchor = rings[0][0];
      const path = document.createElementNS(NS, 'path');
      const projected = rings.map((ring) => projectPath(view, ring));
      const world = 256 * 2 ** view.zoom;
      for (const hole of projected.slice(1)) {
        const shift = Math.round((projected[0][0].x - hole[0].x) / world) * world;
        for (const point of hole) point.x += shift;
      }
      // Draw world copies so a dateline-crossing shape is clipped at the map edge,
      // rather than drawing a false long segment through the opposite hemisphere.
      const allX = projected.flat().map((p) => p.x);
      const firstCopy = Math.ceil(-Math.max(...allX) / world);
      const lastCopy = Math.floor((view.rect.width - Math.min(...allX)) / world);
      const copies: string[] = [];
      for (let copy = firstCopy; copy <= lastCopy; copy++) {
        copies.push(
          projected
            .map(
              (ring) =>
                ring.map((q, i) => `${i ? 'L' : 'M'}${q.x + copy * world},${q.y}`).join(' ') +
                (geometry.type === 'Polygon' ? ' Z' : '')
            )
            .join(' ')
        );
      }
      path.setAttribute('d', copies.join(' '));
      path.setAttribute('fill', geometry.type === 'Polygon' ? color : 'none');
      path.setAttribute('fill-opacity', '0.15');
      path.setAttribute('fill-rule', 'evenodd');
      path.setAttribute('stroke', color);
      path.setAttribute('stroke-width', '3');
      this.svg.append(path);
      if (arrow) {
        const pts = projected[0];
        const a = pts[pts.length - 2];
        const b = pts[pts.length - 1];
        const angle = Math.atan2(b.y - a.y, b.x - a.x);
        for (let copy = firstCopy; copy <= lastCopy; copy++) {
          const x = b.x + copy * world;
          const head = document.createElementNS(NS, 'path');
          head.setAttribute(
            'd',
            `M${x - 12 * Math.cos(angle - 0.5)},${b.y - 12 * Math.sin(angle - 0.5)} L${x},${b.y} L${x - 12 * Math.cos(angle + 0.5)},${b.y - 12 * Math.sin(angle + 0.5)}`
          );
          head.setAttribute('fill', 'none');
          head.setAttribute('stroke', color);
          head.setAttribute('stroke-width', '3');
          this.svg.append(head);
        }
      }
    }
    if (label) {
      const p = project(anchor);
      const text = document.createElementNS(NS, 'text');
      text.setAttribute('x', String(p.x + 9));
      text.setAttribute('y', String(p.y - 9));
      text.setAttribute('fill', color);
      text.setAttribute('font-size', '15');
      text.setAttribute('paint-order', 'stroke');
      text.setAttribute('stroke', '#fff');
      text.setAttribute('stroke-width', '3');
      text.textContent = label;
      this.svg.append(text);
    }
  }

  render() {
    if (!this.adapter.connected) {
      this.dispose();
      return;
    }
    try {
      const view = this.adapter.readView();
      const r = view.rect;
      Object.assign(this.host.style, {
        display: 'block',
        left: `${r.x}px`,
        top: `${r.y}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
      });
      this.svg.replaceChildren();
      for (const annotation of this.annotations.values())
        this.draw(
          annotation.geometry,
          annotation.color,
          annotation.label,
          annotation.kind === 'arrow'
        );
    } catch {
      this.host.style.display = 'none';
    }
  }

  dispose() {
    clearInterval(this.interval);
    this.host.remove();
  }
}
