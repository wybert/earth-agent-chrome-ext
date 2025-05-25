/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/clsx/dist/clsx.mjs":
/*!*****************************************!*\
  !*** ./node_modules/clsx/dist/clsx.mjs ***!
  \*****************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   clsx: () => (/* binding */ clsx),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
function r(e){var t,f,n="";if("string"==typeof e||"number"==typeof e)n+=e;else if("object"==typeof e)if(Array.isArray(e)){var o=e.length;for(t=0;t<o;t++)e[t]&&(f=r(e[t]))&&(n&&(n+=" "),n+=f)}else for(f in e)e[f]&&(n&&(n+=" "),n+=f);return n}function clsx(){for(var e,t,f=0,n="",o=arguments.length;f<o;f++)(e=arguments[f])&&(t=r(e))&&(n&&(n+=" "),n+=t);return n}/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (clsx);

/***/ }),

/***/ "./node_modules/tailwind-merge/dist/bundle-mjs.mjs":
/*!*********************************************************!*\
  !*** ./node_modules/tailwind-merge/dist/bundle-mjs.mjs ***!
  \*********************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createTailwindMerge: () => (/* binding */ createTailwindMerge),
/* harmony export */   extendTailwindMerge: () => (/* binding */ extendTailwindMerge),
/* harmony export */   fromTheme: () => (/* binding */ fromTheme),
/* harmony export */   getDefaultConfig: () => (/* binding */ getDefaultConfig),
/* harmony export */   mergeConfigs: () => (/* binding */ mergeConfigs),
/* harmony export */   twJoin: () => (/* binding */ twJoin),
/* harmony export */   twMerge: () => (/* binding */ twMerge),
/* harmony export */   validators: () => (/* binding */ validators)
/* harmony export */ });
const CLASS_PART_SEPARATOR = '-';
const createClassGroupUtils = config => {
  const classMap = createClassMap(config);
  const {
    conflictingClassGroups,
    conflictingClassGroupModifiers
  } = config;
  const getClassGroupId = className => {
    const classParts = className.split(CLASS_PART_SEPARATOR);
    // Classes like `-inset-1` produce an empty string as first classPart. We assume that classes for negative values are used correctly and remove it from classParts.
    if (classParts[0] === '' && classParts.length !== 1) {
      classParts.shift();
    }
    return getGroupRecursive(classParts, classMap) || getGroupIdForArbitraryProperty(className);
  };
  const getConflictingClassGroupIds = (classGroupId, hasPostfixModifier) => {
    const conflicts = conflictingClassGroups[classGroupId] || [];
    if (hasPostfixModifier && conflictingClassGroupModifiers[classGroupId]) {
      return [...conflicts, ...conflictingClassGroupModifiers[classGroupId]];
    }
    return conflicts;
  };
  return {
    getClassGroupId,
    getConflictingClassGroupIds
  };
};
const getGroupRecursive = (classParts, classPartObject) => {
  if (classParts.length === 0) {
    return classPartObject.classGroupId;
  }
  const currentClassPart = classParts[0];
  const nextClassPartObject = classPartObject.nextPart.get(currentClassPart);
  const classGroupFromNextClassPart = nextClassPartObject ? getGroupRecursive(classParts.slice(1), nextClassPartObject) : undefined;
  if (classGroupFromNextClassPart) {
    return classGroupFromNextClassPart;
  }
  if (classPartObject.validators.length === 0) {
    return undefined;
  }
  const classRest = classParts.join(CLASS_PART_SEPARATOR);
  return classPartObject.validators.find(({
    validator
  }) => validator(classRest))?.classGroupId;
};
const arbitraryPropertyRegex = /^\[(.+)\]$/;
const getGroupIdForArbitraryProperty = className => {
  if (arbitraryPropertyRegex.test(className)) {
    const arbitraryPropertyClassName = arbitraryPropertyRegex.exec(className)[1];
    const property = arbitraryPropertyClassName?.substring(0, arbitraryPropertyClassName.indexOf(':'));
    if (property) {
      // I use two dots here because one dot is used as prefix for class groups in plugins
      return 'arbitrary..' + property;
    }
  }
};
/**
 * Exported for testing only
 */
const createClassMap = config => {
  const {
    theme,
    classGroups
  } = config;
  const classMap = {
    nextPart: new Map(),
    validators: []
  };
  for (const classGroupId in classGroups) {
    processClassesRecursively(classGroups[classGroupId], classMap, classGroupId, theme);
  }
  return classMap;
};
const processClassesRecursively = (classGroup, classPartObject, classGroupId, theme) => {
  classGroup.forEach(classDefinition => {
    if (typeof classDefinition === 'string') {
      const classPartObjectToEdit = classDefinition === '' ? classPartObject : getPart(classPartObject, classDefinition);
      classPartObjectToEdit.classGroupId = classGroupId;
      return;
    }
    if (typeof classDefinition === 'function') {
      if (isThemeGetter(classDefinition)) {
        processClassesRecursively(classDefinition(theme), classPartObject, classGroupId, theme);
        return;
      }
      classPartObject.validators.push({
        validator: classDefinition,
        classGroupId
      });
      return;
    }
    Object.entries(classDefinition).forEach(([key, classGroup]) => {
      processClassesRecursively(classGroup, getPart(classPartObject, key), classGroupId, theme);
    });
  });
};
const getPart = (classPartObject, path) => {
  let currentClassPartObject = classPartObject;
  path.split(CLASS_PART_SEPARATOR).forEach(pathPart => {
    if (!currentClassPartObject.nextPart.has(pathPart)) {
      currentClassPartObject.nextPart.set(pathPart, {
        nextPart: new Map(),
        validators: []
      });
    }
    currentClassPartObject = currentClassPartObject.nextPart.get(pathPart);
  });
  return currentClassPartObject;
};
const isThemeGetter = func => func.isThemeGetter;

// LRU cache inspired from hashlru (https://github.com/dominictarr/hashlru/blob/v1.0.4/index.js) but object replaced with Map to improve performance
const createLruCache = maxCacheSize => {
  if (maxCacheSize < 1) {
    return {
      get: () => undefined,
      set: () => {}
    };
  }
  let cacheSize = 0;
  let cache = new Map();
  let previousCache = new Map();
  const update = (key, value) => {
    cache.set(key, value);
    cacheSize++;
    if (cacheSize > maxCacheSize) {
      cacheSize = 0;
      previousCache = cache;
      cache = new Map();
    }
  };
  return {
    get(key) {
      let value = cache.get(key);
      if (value !== undefined) {
        return value;
      }
      if ((value = previousCache.get(key)) !== undefined) {
        update(key, value);
        return value;
      }
    },
    set(key, value) {
      if (cache.has(key)) {
        cache.set(key, value);
      } else {
        update(key, value);
      }
    }
  };
};
const IMPORTANT_MODIFIER = '!';
const MODIFIER_SEPARATOR = ':';
const MODIFIER_SEPARATOR_LENGTH = MODIFIER_SEPARATOR.length;
const createParseClassName = config => {
  const {
    prefix,
    experimentalParseClassName
  } = config;
  /**
   * Parse class name into parts.
   *
   * Inspired by `splitAtTopLevelOnly` used in Tailwind CSS
   * @see https://github.com/tailwindlabs/tailwindcss/blob/v3.2.2/src/util/splitAtTopLevelOnly.js
   */
  let parseClassName = className => {
    const modifiers = [];
    let bracketDepth = 0;
    let parenDepth = 0;
    let modifierStart = 0;
    let postfixModifierPosition;
    for (let index = 0; index < className.length; index++) {
      let currentCharacter = className[index];
      if (bracketDepth === 0 && parenDepth === 0) {
        if (currentCharacter === MODIFIER_SEPARATOR) {
          modifiers.push(className.slice(modifierStart, index));
          modifierStart = index + MODIFIER_SEPARATOR_LENGTH;
          continue;
        }
        if (currentCharacter === '/') {
          postfixModifierPosition = index;
          continue;
        }
      }
      if (currentCharacter === '[') {
        bracketDepth++;
      } else if (currentCharacter === ']') {
        bracketDepth--;
      } else if (currentCharacter === '(') {
        parenDepth++;
      } else if (currentCharacter === ')') {
        parenDepth--;
      }
    }
    const baseClassNameWithImportantModifier = modifiers.length === 0 ? className : className.substring(modifierStart);
    const baseClassName = stripImportantModifier(baseClassNameWithImportantModifier);
    const hasImportantModifier = baseClassName !== baseClassNameWithImportantModifier;
    const maybePostfixModifierPosition = postfixModifierPosition && postfixModifierPosition > modifierStart ? postfixModifierPosition - modifierStart : undefined;
    return {
      modifiers,
      hasImportantModifier,
      baseClassName,
      maybePostfixModifierPosition
    };
  };
  if (prefix) {
    const fullPrefix = prefix + MODIFIER_SEPARATOR;
    const parseClassNameOriginal = parseClassName;
    parseClassName = className => className.startsWith(fullPrefix) ? parseClassNameOriginal(className.substring(fullPrefix.length)) : {
      isExternal: true,
      modifiers: [],
      hasImportantModifier: false,
      baseClassName: className,
      maybePostfixModifierPosition: undefined
    };
  }
  if (experimentalParseClassName) {
    const parseClassNameOriginal = parseClassName;
    parseClassName = className => experimentalParseClassName({
      className,
      parseClassName: parseClassNameOriginal
    });
  }
  return parseClassName;
};
const stripImportantModifier = baseClassName => {
  if (baseClassName.endsWith(IMPORTANT_MODIFIER)) {
    return baseClassName.substring(0, baseClassName.length - 1);
  }
  /**
   * In Tailwind CSS v3 the important modifier was at the start of the base class name. This is still supported for legacy reasons.
   * @see https://github.com/dcastil/tailwind-merge/issues/513#issuecomment-2614029864
   */
  if (baseClassName.startsWith(IMPORTANT_MODIFIER)) {
    return baseClassName.substring(1);
  }
  return baseClassName;
};

/**
 * Sorts modifiers according to following schema:
 * - Predefined modifiers are sorted alphabetically
 * - When an arbitrary variant appears, it must be preserved which modifiers are before and after it
 */
const createSortModifiers = config => {
  const orderSensitiveModifiers = Object.fromEntries(config.orderSensitiveModifiers.map(modifier => [modifier, true]));
  const sortModifiers = modifiers => {
    if (modifiers.length <= 1) {
      return modifiers;
    }
    const sortedModifiers = [];
    let unsortedModifiers = [];
    modifiers.forEach(modifier => {
      const isPositionSensitive = modifier[0] === '[' || orderSensitiveModifiers[modifier];
      if (isPositionSensitive) {
        sortedModifiers.push(...unsortedModifiers.sort(), modifier);
        unsortedModifiers = [];
      } else {
        unsortedModifiers.push(modifier);
      }
    });
    sortedModifiers.push(...unsortedModifiers.sort());
    return sortedModifiers;
  };
  return sortModifiers;
};
const createConfigUtils = config => ({
  cache: createLruCache(config.cacheSize),
  parseClassName: createParseClassName(config),
  sortModifiers: createSortModifiers(config),
  ...createClassGroupUtils(config)
});
const SPLIT_CLASSES_REGEX = /\s+/;
const mergeClassList = (classList, configUtils) => {
  const {
    parseClassName,
    getClassGroupId,
    getConflictingClassGroupIds,
    sortModifiers
  } = configUtils;
  /**
   * Set of classGroupIds in following format:
   * `{importantModifier}{variantModifiers}{classGroupId}`
   * @example 'float'
   * @example 'hover:focus:bg-color'
   * @example 'md:!pr'
   */
  const classGroupsInConflict = [];
  const classNames = classList.trim().split(SPLIT_CLASSES_REGEX);
  let result = '';
  for (let index = classNames.length - 1; index >= 0; index -= 1) {
    const originalClassName = classNames[index];
    const {
      isExternal,
      modifiers,
      hasImportantModifier,
      baseClassName,
      maybePostfixModifierPosition
    } = parseClassName(originalClassName);
    if (isExternal) {
      result = originalClassName + (result.length > 0 ? ' ' + result : result);
      continue;
    }
    let hasPostfixModifier = !!maybePostfixModifierPosition;
    let classGroupId = getClassGroupId(hasPostfixModifier ? baseClassName.substring(0, maybePostfixModifierPosition) : baseClassName);
    if (!classGroupId) {
      if (!hasPostfixModifier) {
        // Not a Tailwind class
        result = originalClassName + (result.length > 0 ? ' ' + result : result);
        continue;
      }
      classGroupId = getClassGroupId(baseClassName);
      if (!classGroupId) {
        // Not a Tailwind class
        result = originalClassName + (result.length > 0 ? ' ' + result : result);
        continue;
      }
      hasPostfixModifier = false;
    }
    const variantModifier = sortModifiers(modifiers).join(':');
    const modifierId = hasImportantModifier ? variantModifier + IMPORTANT_MODIFIER : variantModifier;
    const classId = modifierId + classGroupId;
    if (classGroupsInConflict.includes(classId)) {
      // Tailwind class omitted due to conflict
      continue;
    }
    classGroupsInConflict.push(classId);
    const conflictGroups = getConflictingClassGroupIds(classGroupId, hasPostfixModifier);
    for (let i = 0; i < conflictGroups.length; ++i) {
      const group = conflictGroups[i];
      classGroupsInConflict.push(modifierId + group);
    }
    // Tailwind class not in conflict
    result = originalClassName + (result.length > 0 ? ' ' + result : result);
  }
  return result;
};

/**
 * The code in this file is copied from https://github.com/lukeed/clsx and modified to suit the needs of tailwind-merge better.
 *
 * Specifically:
 * - Runtime code from https://github.com/lukeed/clsx/blob/v1.2.1/src/index.js
 * - TypeScript types from https://github.com/lukeed/clsx/blob/v1.2.1/clsx.d.ts
 *
 * Original code has MIT license: Copyright (c) Luke Edwards <luke.edwards05@gmail.com> (lukeed.com)
 */
function twJoin() {
  let index = 0;
  let argument;
  let resolvedValue;
  let string = '';
  while (index < arguments.length) {
    if (argument = arguments[index++]) {
      if (resolvedValue = toValue(argument)) {
        string && (string += ' ');
        string += resolvedValue;
      }
    }
  }
  return string;
}
const toValue = mix => {
  if (typeof mix === 'string') {
    return mix;
  }
  let resolvedValue;
  let string = '';
  for (let k = 0; k < mix.length; k++) {
    if (mix[k]) {
      if (resolvedValue = toValue(mix[k])) {
        string && (string += ' ');
        string += resolvedValue;
      }
    }
  }
  return string;
};
function createTailwindMerge(createConfigFirst, ...createConfigRest) {
  let configUtils;
  let cacheGet;
  let cacheSet;
  let functionToCall = initTailwindMerge;
  function initTailwindMerge(classList) {
    const config = createConfigRest.reduce((previousConfig, createConfigCurrent) => createConfigCurrent(previousConfig), createConfigFirst());
    configUtils = createConfigUtils(config);
    cacheGet = configUtils.cache.get;
    cacheSet = configUtils.cache.set;
    functionToCall = tailwindMerge;
    return tailwindMerge(classList);
  }
  function tailwindMerge(classList) {
    const cachedResult = cacheGet(classList);
    if (cachedResult) {
      return cachedResult;
    }
    const result = mergeClassList(classList, configUtils);
    cacheSet(classList, result);
    return result;
  }
  return function callTailwindMerge() {
    return functionToCall(twJoin.apply(null, arguments));
  };
}
const fromTheme = key => {
  const themeGetter = theme => theme[key] || [];
  themeGetter.isThemeGetter = true;
  return themeGetter;
};
const arbitraryValueRegex = /^\[(?:(\w[\w-]*):)?(.+)\]$/i;
const arbitraryVariableRegex = /^\((?:(\w[\w-]*):)?(.+)\)$/i;
const fractionRegex = /^\d+\/\d+$/;
const tshirtUnitRegex = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/;
const lengthUnitRegex = /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/;
const colorFunctionRegex = /^(rgba?|hsla?|hwb|(ok)?(lab|lch))\(.+\)$/;
// Shadow always begins with x and y offset separated by underscore optionally prepended by inset
const shadowRegex = /^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/;
const imageRegex = /^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/;
const isFraction = value => fractionRegex.test(value);
const isNumber = value => !!value && !Number.isNaN(Number(value));
const isInteger = value => !!value && Number.isInteger(Number(value));
const isPercent = value => value.endsWith('%') && isNumber(value.slice(0, -1));
const isTshirtSize = value => tshirtUnitRegex.test(value);
const isAny = () => true;
const isLengthOnly = value =>
// `colorFunctionRegex` check is necessary because color functions can have percentages in them which which would be incorrectly classified as lengths.
// For example, `hsl(0 0% 0%)` would be classified as a length without this check.
// I could also use lookbehind assertion in `lengthUnitRegex` but that isn't supported widely enough.
lengthUnitRegex.test(value) && !colorFunctionRegex.test(value);
const isNever = () => false;
const isShadow = value => shadowRegex.test(value);
const isImage = value => imageRegex.test(value);
const isAnyNonArbitrary = value => !isArbitraryValue(value) && !isArbitraryVariable(value);
const isArbitrarySize = value => getIsArbitraryValue(value, isLabelSize, isNever);
const isArbitraryValue = value => arbitraryValueRegex.test(value);
const isArbitraryLength = value => getIsArbitraryValue(value, isLabelLength, isLengthOnly);
const isArbitraryNumber = value => getIsArbitraryValue(value, isLabelNumber, isNumber);
const isArbitraryPosition = value => getIsArbitraryValue(value, isLabelPosition, isNever);
const isArbitraryImage = value => getIsArbitraryValue(value, isLabelImage, isImage);
const isArbitraryShadow = value => getIsArbitraryValue(value, isLabelShadow, isShadow);
const isArbitraryVariable = value => arbitraryVariableRegex.test(value);
const isArbitraryVariableLength = value => getIsArbitraryVariable(value, isLabelLength);
const isArbitraryVariableFamilyName = value => getIsArbitraryVariable(value, isLabelFamilyName);
const isArbitraryVariablePosition = value => getIsArbitraryVariable(value, isLabelPosition);
const isArbitraryVariableSize = value => getIsArbitraryVariable(value, isLabelSize);
const isArbitraryVariableImage = value => getIsArbitraryVariable(value, isLabelImage);
const isArbitraryVariableShadow = value => getIsArbitraryVariable(value, isLabelShadow, true);
// Helpers
const getIsArbitraryValue = (value, testLabel, testValue) => {
  const result = arbitraryValueRegex.exec(value);
  if (result) {
    if (result[1]) {
      return testLabel(result[1]);
    }
    return testValue(result[2]);
  }
  return false;
};
const getIsArbitraryVariable = (value, testLabel, shouldMatchNoLabel = false) => {
  const result = arbitraryVariableRegex.exec(value);
  if (result) {
    if (result[1]) {
      return testLabel(result[1]);
    }
    return shouldMatchNoLabel;
  }
  return false;
};
// Labels
const isLabelPosition = label => label === 'position' || label === 'percentage';
const isLabelImage = label => label === 'image' || label === 'url';
const isLabelSize = label => label === 'length' || label === 'size' || label === 'bg-size';
const isLabelLength = label => label === 'length';
const isLabelNumber = label => label === 'number';
const isLabelFamilyName = label => label === 'family-name';
const isLabelShadow = label => label === 'shadow';
const validators = /*#__PURE__*/Object.defineProperty({
  __proto__: null,
  isAny,
  isAnyNonArbitrary,
  isArbitraryImage,
  isArbitraryLength,
  isArbitraryNumber,
  isArbitraryPosition,
  isArbitraryShadow,
  isArbitrarySize,
  isArbitraryValue,
  isArbitraryVariable,
  isArbitraryVariableFamilyName,
  isArbitraryVariableImage,
  isArbitraryVariableLength,
  isArbitraryVariablePosition,
  isArbitraryVariableShadow,
  isArbitraryVariableSize,
  isFraction,
  isInteger,
  isNumber,
  isPercent,
  isTshirtSize
}, Symbol.toStringTag, {
  value: 'Module'
});
const getDefaultConfig = () => {
  /**
   * Theme getters for theme variable namespaces
   * @see https://tailwindcss.com/docs/theme#theme-variable-namespaces
   */
  /***/
  const themeColor = fromTheme('color');
  const themeFont = fromTheme('font');
  const themeText = fromTheme('text');
  const themeFontWeight = fromTheme('font-weight');
  const themeTracking = fromTheme('tracking');
  const themeLeading = fromTheme('leading');
  const themeBreakpoint = fromTheme('breakpoint');
  const themeContainer = fromTheme('container');
  const themeSpacing = fromTheme('spacing');
  const themeRadius = fromTheme('radius');
  const themeShadow = fromTheme('shadow');
  const themeInsetShadow = fromTheme('inset-shadow');
  const themeTextShadow = fromTheme('text-shadow');
  const themeDropShadow = fromTheme('drop-shadow');
  const themeBlur = fromTheme('blur');
  const themePerspective = fromTheme('perspective');
  const themeAspect = fromTheme('aspect');
  const themeEase = fromTheme('ease');
  const themeAnimate = fromTheme('animate');
  /**
   * Helpers to avoid repeating the same scales
   *
   * We use functions that create a new array every time they're called instead of static arrays.
   * This ensures that users who modify any scale by mutating the array (e.g. with `array.push(element)`) don't accidentally mutate arrays in other parts of the config.
   */
  /***/
  const scaleBreak = () => ['auto', 'avoid', 'all', 'avoid-page', 'page', 'left', 'right', 'column'];
  const scalePosition = () => ['center', 'top', 'bottom', 'left', 'right', 'top-left',
  // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
  'left-top', 'top-right',
  // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
  'right-top', 'bottom-right',
  // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
  'right-bottom', 'bottom-left',
  // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
  'left-bottom'];
  const scalePositionWithArbitrary = () => [...scalePosition(), isArbitraryVariable, isArbitraryValue];
  const scaleOverflow = () => ['auto', 'hidden', 'clip', 'visible', 'scroll'];
  const scaleOverscroll = () => ['auto', 'contain', 'none'];
  const scaleUnambiguousSpacing = () => [isArbitraryVariable, isArbitraryValue, themeSpacing];
  const scaleInset = () => [isFraction, 'full', 'auto', ...scaleUnambiguousSpacing()];
  const scaleGridTemplateColsRows = () => [isInteger, 'none', 'subgrid', isArbitraryVariable, isArbitraryValue];
  const scaleGridColRowStartAndEnd = () => ['auto', {
    span: ['full', isInteger, isArbitraryVariable, isArbitraryValue]
  }, isInteger, isArbitraryVariable, isArbitraryValue];
  const scaleGridColRowStartOrEnd = () => [isInteger, 'auto', isArbitraryVariable, isArbitraryValue];
  const scaleGridAutoColsRows = () => ['auto', 'min', 'max', 'fr', isArbitraryVariable, isArbitraryValue];
  const scaleAlignPrimaryAxis = () => ['start', 'end', 'center', 'between', 'around', 'evenly', 'stretch', 'baseline', 'center-safe', 'end-safe'];
  const scaleAlignSecondaryAxis = () => ['start', 'end', 'center', 'stretch', 'center-safe', 'end-safe'];
  const scaleMargin = () => ['auto', ...scaleUnambiguousSpacing()];
  const scaleSizing = () => [isFraction, 'auto', 'full', 'dvw', 'dvh', 'lvw', 'lvh', 'svw', 'svh', 'min', 'max', 'fit', ...scaleUnambiguousSpacing()];
  const scaleColor = () => [themeColor, isArbitraryVariable, isArbitraryValue];
  const scaleBgPosition = () => [...scalePosition(), isArbitraryVariablePosition, isArbitraryPosition, {
    position: [isArbitraryVariable, isArbitraryValue]
  }];
  const scaleBgRepeat = () => ['no-repeat', {
    repeat: ['', 'x', 'y', 'space', 'round']
  }];
  const scaleBgSize = () => ['auto', 'cover', 'contain', isArbitraryVariableSize, isArbitrarySize, {
    size: [isArbitraryVariable, isArbitraryValue]
  }];
  const scaleGradientStopPosition = () => [isPercent, isArbitraryVariableLength, isArbitraryLength];
  const scaleRadius = () => [
  // Deprecated since Tailwind CSS v4.0.0
  '', 'none', 'full', themeRadius, isArbitraryVariable, isArbitraryValue];
  const scaleBorderWidth = () => ['', isNumber, isArbitraryVariableLength, isArbitraryLength];
  const scaleLineStyle = () => ['solid', 'dashed', 'dotted', 'double'];
  const scaleBlendMode = () => ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'];
  const scaleMaskImagePosition = () => [isNumber, isPercent, isArbitraryVariablePosition, isArbitraryPosition];
  const scaleBlur = () => [
  // Deprecated since Tailwind CSS v4.0.0
  '', 'none', themeBlur, isArbitraryVariable, isArbitraryValue];
  const scaleRotate = () => ['none', isNumber, isArbitraryVariable, isArbitraryValue];
  const scaleScale = () => ['none', isNumber, isArbitraryVariable, isArbitraryValue];
  const scaleSkew = () => [isNumber, isArbitraryVariable, isArbitraryValue];
  const scaleTranslate = () => [isFraction, 'full', ...scaleUnambiguousSpacing()];
  return {
    cacheSize: 500,
    theme: {
      animate: ['spin', 'ping', 'pulse', 'bounce'],
      aspect: ['video'],
      blur: [isTshirtSize],
      breakpoint: [isTshirtSize],
      color: [isAny],
      container: [isTshirtSize],
      'drop-shadow': [isTshirtSize],
      ease: ['in', 'out', 'in-out'],
      font: [isAnyNonArbitrary],
      'font-weight': ['thin', 'extralight', 'light', 'normal', 'medium', 'semibold', 'bold', 'extrabold', 'black'],
      'inset-shadow': [isTshirtSize],
      leading: ['none', 'tight', 'snug', 'normal', 'relaxed', 'loose'],
      perspective: ['dramatic', 'near', 'normal', 'midrange', 'distant', 'none'],
      radius: [isTshirtSize],
      shadow: [isTshirtSize],
      spacing: ['px', isNumber],
      text: [isTshirtSize],
      'text-shadow': [isTshirtSize],
      tracking: ['tighter', 'tight', 'normal', 'wide', 'wider', 'widest']
    },
    classGroups: {
      // --------------
      // --- Layout ---
      // --------------
      /**
       * Aspect Ratio
       * @see https://tailwindcss.com/docs/aspect-ratio
       */
      aspect: [{
        aspect: ['auto', 'square', isFraction, isArbitraryValue, isArbitraryVariable, themeAspect]
      }],
      /**
       * Container
       * @see https://tailwindcss.com/docs/container
       * @deprecated since Tailwind CSS v4.0.0
       */
      container: ['container'],
      /**
       * Columns
       * @see https://tailwindcss.com/docs/columns
       */
      columns: [{
        columns: [isNumber, isArbitraryValue, isArbitraryVariable, themeContainer]
      }],
      /**
       * Break After
       * @see https://tailwindcss.com/docs/break-after
       */
      'break-after': [{
        'break-after': scaleBreak()
      }],
      /**
       * Break Before
       * @see https://tailwindcss.com/docs/break-before
       */
      'break-before': [{
        'break-before': scaleBreak()
      }],
      /**
       * Break Inside
       * @see https://tailwindcss.com/docs/break-inside
       */
      'break-inside': [{
        'break-inside': ['auto', 'avoid', 'avoid-page', 'avoid-column']
      }],
      /**
       * Box Decoration Break
       * @see https://tailwindcss.com/docs/box-decoration-break
       */
      'box-decoration': [{
        'box-decoration': ['slice', 'clone']
      }],
      /**
       * Box Sizing
       * @see https://tailwindcss.com/docs/box-sizing
       */
      box: [{
        box: ['border', 'content']
      }],
      /**
       * Display
       * @see https://tailwindcss.com/docs/display
       */
      display: ['block', 'inline-block', 'inline', 'flex', 'inline-flex', 'table', 'inline-table', 'table-caption', 'table-cell', 'table-column', 'table-column-group', 'table-footer-group', 'table-header-group', 'table-row-group', 'table-row', 'flow-root', 'grid', 'inline-grid', 'contents', 'list-item', 'hidden'],
      /**
       * Screen Reader Only
       * @see https://tailwindcss.com/docs/display#screen-reader-only
       */
      sr: ['sr-only', 'not-sr-only'],
      /**
       * Floats
       * @see https://tailwindcss.com/docs/float
       */
      float: [{
        float: ['right', 'left', 'none', 'start', 'end']
      }],
      /**
       * Clear
       * @see https://tailwindcss.com/docs/clear
       */
      clear: [{
        clear: ['left', 'right', 'both', 'none', 'start', 'end']
      }],
      /**
       * Isolation
       * @see https://tailwindcss.com/docs/isolation
       */
      isolation: ['isolate', 'isolation-auto'],
      /**
       * Object Fit
       * @see https://tailwindcss.com/docs/object-fit
       */
      'object-fit': [{
        object: ['contain', 'cover', 'fill', 'none', 'scale-down']
      }],
      /**
       * Object Position
       * @see https://tailwindcss.com/docs/object-position
       */
      'object-position': [{
        object: scalePositionWithArbitrary()
      }],
      /**
       * Overflow
       * @see https://tailwindcss.com/docs/overflow
       */
      overflow: [{
        overflow: scaleOverflow()
      }],
      /**
       * Overflow X
       * @see https://tailwindcss.com/docs/overflow
       */
      'overflow-x': [{
        'overflow-x': scaleOverflow()
      }],
      /**
       * Overflow Y
       * @see https://tailwindcss.com/docs/overflow
       */
      'overflow-y': [{
        'overflow-y': scaleOverflow()
      }],
      /**
       * Overscroll Behavior
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      overscroll: [{
        overscroll: scaleOverscroll()
      }],
      /**
       * Overscroll Behavior X
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      'overscroll-x': [{
        'overscroll-x': scaleOverscroll()
      }],
      /**
       * Overscroll Behavior Y
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      'overscroll-y': [{
        'overscroll-y': scaleOverscroll()
      }],
      /**
       * Position
       * @see https://tailwindcss.com/docs/position
       */
      position: ['static', 'fixed', 'absolute', 'relative', 'sticky'],
      /**
       * Top / Right / Bottom / Left
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      inset: [{
        inset: scaleInset()
      }],
      /**
       * Right / Left
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      'inset-x': [{
        'inset-x': scaleInset()
      }],
      /**
       * Top / Bottom
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      'inset-y': [{
        'inset-y': scaleInset()
      }],
      /**
       * Start
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      start: [{
        start: scaleInset()
      }],
      /**
       * End
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      end: [{
        end: scaleInset()
      }],
      /**
       * Top
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      top: [{
        top: scaleInset()
      }],
      /**
       * Right
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      right: [{
        right: scaleInset()
      }],
      /**
       * Bottom
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      bottom: [{
        bottom: scaleInset()
      }],
      /**
       * Left
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      left: [{
        left: scaleInset()
      }],
      /**
       * Visibility
       * @see https://tailwindcss.com/docs/visibility
       */
      visibility: ['visible', 'invisible', 'collapse'],
      /**
       * Z-Index
       * @see https://tailwindcss.com/docs/z-index
       */
      z: [{
        z: [isInteger, 'auto', isArbitraryVariable, isArbitraryValue]
      }],
      // ------------------------
      // --- Flexbox and Grid ---
      // ------------------------
      /**
       * Flex Basis
       * @see https://tailwindcss.com/docs/flex-basis
       */
      basis: [{
        basis: [isFraction, 'full', 'auto', themeContainer, ...scaleUnambiguousSpacing()]
      }],
      /**
       * Flex Direction
       * @see https://tailwindcss.com/docs/flex-direction
       */
      'flex-direction': [{
        flex: ['row', 'row-reverse', 'col', 'col-reverse']
      }],
      /**
       * Flex Wrap
       * @see https://tailwindcss.com/docs/flex-wrap
       */
      'flex-wrap': [{
        flex: ['nowrap', 'wrap', 'wrap-reverse']
      }],
      /**
       * Flex
       * @see https://tailwindcss.com/docs/flex
       */
      flex: [{
        flex: [isNumber, isFraction, 'auto', 'initial', 'none', isArbitraryValue]
      }],
      /**
       * Flex Grow
       * @see https://tailwindcss.com/docs/flex-grow
       */
      grow: [{
        grow: ['', isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Flex Shrink
       * @see https://tailwindcss.com/docs/flex-shrink
       */
      shrink: [{
        shrink: ['', isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Order
       * @see https://tailwindcss.com/docs/order
       */
      order: [{
        order: [isInteger, 'first', 'last', 'none', isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Grid Template Columns
       * @see https://tailwindcss.com/docs/grid-template-columns
       */
      'grid-cols': [{
        'grid-cols': scaleGridTemplateColsRows()
      }],
      /**
       * Grid Column Start / End
       * @see https://tailwindcss.com/docs/grid-column
       */
      'col-start-end': [{
        col: scaleGridColRowStartAndEnd()
      }],
      /**
       * Grid Column Start
       * @see https://tailwindcss.com/docs/grid-column
       */
      'col-start': [{
        'col-start': scaleGridColRowStartOrEnd()
      }],
      /**
       * Grid Column End
       * @see https://tailwindcss.com/docs/grid-column
       */
      'col-end': [{
        'col-end': scaleGridColRowStartOrEnd()
      }],
      /**
       * Grid Template Rows
       * @see https://tailwindcss.com/docs/grid-template-rows
       */
      'grid-rows': [{
        'grid-rows': scaleGridTemplateColsRows()
      }],
      /**
       * Grid Row Start / End
       * @see https://tailwindcss.com/docs/grid-row
       */
      'row-start-end': [{
        row: scaleGridColRowStartAndEnd()
      }],
      /**
       * Grid Row Start
       * @see https://tailwindcss.com/docs/grid-row
       */
      'row-start': [{
        'row-start': scaleGridColRowStartOrEnd()
      }],
      /**
       * Grid Row End
       * @see https://tailwindcss.com/docs/grid-row
       */
      'row-end': [{
        'row-end': scaleGridColRowStartOrEnd()
      }],
      /**
       * Grid Auto Flow
       * @see https://tailwindcss.com/docs/grid-auto-flow
       */
      'grid-flow': [{
        'grid-flow': ['row', 'col', 'dense', 'row-dense', 'col-dense']
      }],
      /**
       * Grid Auto Columns
       * @see https://tailwindcss.com/docs/grid-auto-columns
       */
      'auto-cols': [{
        'auto-cols': scaleGridAutoColsRows()
      }],
      /**
       * Grid Auto Rows
       * @see https://tailwindcss.com/docs/grid-auto-rows
       */
      'auto-rows': [{
        'auto-rows': scaleGridAutoColsRows()
      }],
      /**
       * Gap
       * @see https://tailwindcss.com/docs/gap
       */
      gap: [{
        gap: scaleUnambiguousSpacing()
      }],
      /**
       * Gap X
       * @see https://tailwindcss.com/docs/gap
       */
      'gap-x': [{
        'gap-x': scaleUnambiguousSpacing()
      }],
      /**
       * Gap Y
       * @see https://tailwindcss.com/docs/gap
       */
      'gap-y': [{
        'gap-y': scaleUnambiguousSpacing()
      }],
      /**
       * Justify Content
       * @see https://tailwindcss.com/docs/justify-content
       */
      'justify-content': [{
        justify: [...scaleAlignPrimaryAxis(), 'normal']
      }],
      /**
       * Justify Items
       * @see https://tailwindcss.com/docs/justify-items
       */
      'justify-items': [{
        'justify-items': [...scaleAlignSecondaryAxis(), 'normal']
      }],
      /**
       * Justify Self
       * @see https://tailwindcss.com/docs/justify-self
       */
      'justify-self': [{
        'justify-self': ['auto', ...scaleAlignSecondaryAxis()]
      }],
      /**
       * Align Content
       * @see https://tailwindcss.com/docs/align-content
       */
      'align-content': [{
        content: ['normal', ...scaleAlignPrimaryAxis()]
      }],
      /**
       * Align Items
       * @see https://tailwindcss.com/docs/align-items
       */
      'align-items': [{
        items: [...scaleAlignSecondaryAxis(), {
          baseline: ['', 'last']
        }]
      }],
      /**
       * Align Self
       * @see https://tailwindcss.com/docs/align-self
       */
      'align-self': [{
        self: ['auto', ...scaleAlignSecondaryAxis(), {
          baseline: ['', 'last']
        }]
      }],
      /**
       * Place Content
       * @see https://tailwindcss.com/docs/place-content
       */
      'place-content': [{
        'place-content': scaleAlignPrimaryAxis()
      }],
      /**
       * Place Items
       * @see https://tailwindcss.com/docs/place-items
       */
      'place-items': [{
        'place-items': [...scaleAlignSecondaryAxis(), 'baseline']
      }],
      /**
       * Place Self
       * @see https://tailwindcss.com/docs/place-self
       */
      'place-self': [{
        'place-self': ['auto', ...scaleAlignSecondaryAxis()]
      }],
      // Spacing
      /**
       * Padding
       * @see https://tailwindcss.com/docs/padding
       */
      p: [{
        p: scaleUnambiguousSpacing()
      }],
      /**
       * Padding X
       * @see https://tailwindcss.com/docs/padding
       */
      px: [{
        px: scaleUnambiguousSpacing()
      }],
      /**
       * Padding Y
       * @see https://tailwindcss.com/docs/padding
       */
      py: [{
        py: scaleUnambiguousSpacing()
      }],
      /**
       * Padding Start
       * @see https://tailwindcss.com/docs/padding
       */
      ps: [{
        ps: scaleUnambiguousSpacing()
      }],
      /**
       * Padding End
       * @see https://tailwindcss.com/docs/padding
       */
      pe: [{
        pe: scaleUnambiguousSpacing()
      }],
      /**
       * Padding Top
       * @see https://tailwindcss.com/docs/padding
       */
      pt: [{
        pt: scaleUnambiguousSpacing()
      }],
      /**
       * Padding Right
       * @see https://tailwindcss.com/docs/padding
       */
      pr: [{
        pr: scaleUnambiguousSpacing()
      }],
      /**
       * Padding Bottom
       * @see https://tailwindcss.com/docs/padding
       */
      pb: [{
        pb: scaleUnambiguousSpacing()
      }],
      /**
       * Padding Left
       * @see https://tailwindcss.com/docs/padding
       */
      pl: [{
        pl: scaleUnambiguousSpacing()
      }],
      /**
       * Margin
       * @see https://tailwindcss.com/docs/margin
       */
      m: [{
        m: scaleMargin()
      }],
      /**
       * Margin X
       * @see https://tailwindcss.com/docs/margin
       */
      mx: [{
        mx: scaleMargin()
      }],
      /**
       * Margin Y
       * @see https://tailwindcss.com/docs/margin
       */
      my: [{
        my: scaleMargin()
      }],
      /**
       * Margin Start
       * @see https://tailwindcss.com/docs/margin
       */
      ms: [{
        ms: scaleMargin()
      }],
      /**
       * Margin End
       * @see https://tailwindcss.com/docs/margin
       */
      me: [{
        me: scaleMargin()
      }],
      /**
       * Margin Top
       * @see https://tailwindcss.com/docs/margin
       */
      mt: [{
        mt: scaleMargin()
      }],
      /**
       * Margin Right
       * @see https://tailwindcss.com/docs/margin
       */
      mr: [{
        mr: scaleMargin()
      }],
      /**
       * Margin Bottom
       * @see https://tailwindcss.com/docs/margin
       */
      mb: [{
        mb: scaleMargin()
      }],
      /**
       * Margin Left
       * @see https://tailwindcss.com/docs/margin
       */
      ml: [{
        ml: scaleMargin()
      }],
      /**
       * Space Between X
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      'space-x': [{
        'space-x': scaleUnambiguousSpacing()
      }],
      /**
       * Space Between X Reverse
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      'space-x-reverse': ['space-x-reverse'],
      /**
       * Space Between Y
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      'space-y': [{
        'space-y': scaleUnambiguousSpacing()
      }],
      /**
       * Space Between Y Reverse
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      'space-y-reverse': ['space-y-reverse'],
      // --------------
      // --- Sizing ---
      // --------------
      /**
       * Size
       * @see https://tailwindcss.com/docs/width#setting-both-width-and-height
       */
      size: [{
        size: scaleSizing()
      }],
      /**
       * Width
       * @see https://tailwindcss.com/docs/width
       */
      w: [{
        w: [themeContainer, 'screen', ...scaleSizing()]
      }],
      /**
       * Min-Width
       * @see https://tailwindcss.com/docs/min-width
       */
      'min-w': [{
        'min-w': [themeContainer, 'screen', /** Deprecated. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
        'none', ...scaleSizing()]
      }],
      /**
       * Max-Width
       * @see https://tailwindcss.com/docs/max-width
       */
      'max-w': [{
        'max-w': [themeContainer, 'screen', 'none', /** Deprecated since Tailwind CSS v4.0.0. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
        'prose', /** Deprecated since Tailwind CSS v4.0.0. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
        {
          screen: [themeBreakpoint]
        }, ...scaleSizing()]
      }],
      /**
       * Height
       * @see https://tailwindcss.com/docs/height
       */
      h: [{
        h: ['screen', ...scaleSizing()]
      }],
      /**
       * Min-Height
       * @see https://tailwindcss.com/docs/min-height
       */
      'min-h': [{
        'min-h': ['screen', 'none', ...scaleSizing()]
      }],
      /**
       * Max-Height
       * @see https://tailwindcss.com/docs/max-height
       */
      'max-h': [{
        'max-h': ['screen', ...scaleSizing()]
      }],
      // ------------------
      // --- Typography ---
      // ------------------
      /**
       * Font Size
       * @see https://tailwindcss.com/docs/font-size
       */
      'font-size': [{
        text: ['base', themeText, isArbitraryVariableLength, isArbitraryLength]
      }],
      /**
       * Font Smoothing
       * @see https://tailwindcss.com/docs/font-smoothing
       */
      'font-smoothing': ['antialiased', 'subpixel-antialiased'],
      /**
       * Font Style
       * @see https://tailwindcss.com/docs/font-style
       */
      'font-style': ['italic', 'not-italic'],
      /**
       * Font Weight
       * @see https://tailwindcss.com/docs/font-weight
       */
      'font-weight': [{
        font: [themeFontWeight, isArbitraryVariable, isArbitraryNumber]
      }],
      /**
       * Font Stretch
       * @see https://tailwindcss.com/docs/font-stretch
       */
      'font-stretch': [{
        'font-stretch': ['ultra-condensed', 'extra-condensed', 'condensed', 'semi-condensed', 'normal', 'semi-expanded', 'expanded', 'extra-expanded', 'ultra-expanded', isPercent, isArbitraryValue]
      }],
      /**
       * Font Family
       * @see https://tailwindcss.com/docs/font-family
       */
      'font-family': [{
        font: [isArbitraryVariableFamilyName, isArbitraryValue, themeFont]
      }],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      'fvn-normal': ['normal-nums'],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      'fvn-ordinal': ['ordinal'],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      'fvn-slashed-zero': ['slashed-zero'],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      'fvn-figure': ['lining-nums', 'oldstyle-nums'],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      'fvn-spacing': ['proportional-nums', 'tabular-nums'],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      'fvn-fraction': ['diagonal-fractions', 'stacked-fractions'],
      /**
       * Letter Spacing
       * @see https://tailwindcss.com/docs/letter-spacing
       */
      tracking: [{
        tracking: [themeTracking, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Line Clamp
       * @see https://tailwindcss.com/docs/line-clamp
       */
      'line-clamp': [{
        'line-clamp': [isNumber, 'none', isArbitraryVariable, isArbitraryNumber]
      }],
      /**
       * Line Height
       * @see https://tailwindcss.com/docs/line-height
       */
      leading: [{
        leading: [/** Deprecated since Tailwind CSS v4.0.0. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
        themeLeading, ...scaleUnambiguousSpacing()]
      }],
      /**
       * List Style Image
       * @see https://tailwindcss.com/docs/list-style-image
       */
      'list-image': [{
        'list-image': ['none', isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * List Style Position
       * @see https://tailwindcss.com/docs/list-style-position
       */
      'list-style-position': [{
        list: ['inside', 'outside']
      }],
      /**
       * List Style Type
       * @see https://tailwindcss.com/docs/list-style-type
       */
      'list-style-type': [{
        list: ['disc', 'decimal', 'none', isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Text Alignment
       * @see https://tailwindcss.com/docs/text-align
       */
      'text-alignment': [{
        text: ['left', 'center', 'right', 'justify', 'start', 'end']
      }],
      /**
       * Placeholder Color
       * @deprecated since Tailwind CSS v3.0.0
       * @see https://v3.tailwindcss.com/docs/placeholder-color
       */
      'placeholder-color': [{
        placeholder: scaleColor()
      }],
      /**
       * Text Color
       * @see https://tailwindcss.com/docs/text-color
       */
      'text-color': [{
        text: scaleColor()
      }],
      /**
       * Text Decoration
       * @see https://tailwindcss.com/docs/text-decoration
       */
      'text-decoration': ['underline', 'overline', 'line-through', 'no-underline'],
      /**
       * Text Decoration Style
       * @see https://tailwindcss.com/docs/text-decoration-style
       */
      'text-decoration-style': [{
        decoration: [...scaleLineStyle(), 'wavy']
      }],
      /**
       * Text Decoration Thickness
       * @see https://tailwindcss.com/docs/text-decoration-thickness
       */
      'text-decoration-thickness': [{
        decoration: [isNumber, 'from-font', 'auto', isArbitraryVariable, isArbitraryLength]
      }],
      /**
       * Text Decoration Color
       * @see https://tailwindcss.com/docs/text-decoration-color
       */
      'text-decoration-color': [{
        decoration: scaleColor()
      }],
      /**
       * Text Underline Offset
       * @see https://tailwindcss.com/docs/text-underline-offset
       */
      'underline-offset': [{
        'underline-offset': [isNumber, 'auto', isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Text Transform
       * @see https://tailwindcss.com/docs/text-transform
       */
      'text-transform': ['uppercase', 'lowercase', 'capitalize', 'normal-case'],
      /**
       * Text Overflow
       * @see https://tailwindcss.com/docs/text-overflow
       */
      'text-overflow': ['truncate', 'text-ellipsis', 'text-clip'],
      /**
       * Text Wrap
       * @see https://tailwindcss.com/docs/text-wrap
       */
      'text-wrap': [{
        text: ['wrap', 'nowrap', 'balance', 'pretty']
      }],
      /**
       * Text Indent
       * @see https://tailwindcss.com/docs/text-indent
       */
      indent: [{
        indent: scaleUnambiguousSpacing()
      }],
      /**
       * Vertical Alignment
       * @see https://tailwindcss.com/docs/vertical-align
       */
      'vertical-align': [{
        align: ['baseline', 'top', 'middle', 'bottom', 'text-top', 'text-bottom', 'sub', 'super', isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Whitespace
       * @see https://tailwindcss.com/docs/whitespace
       */
      whitespace: [{
        whitespace: ['normal', 'nowrap', 'pre', 'pre-line', 'pre-wrap', 'break-spaces']
      }],
      /**
       * Word Break
       * @see https://tailwindcss.com/docs/word-break
       */
      break: [{
        break: ['normal', 'words', 'all', 'keep']
      }],
      /**
       * Overflow Wrap
       * @see https://tailwindcss.com/docs/overflow-wrap
       */
      wrap: [{
        wrap: ['break-word', 'anywhere', 'normal']
      }],
      /**
       * Hyphens
       * @see https://tailwindcss.com/docs/hyphens
       */
      hyphens: [{
        hyphens: ['none', 'manual', 'auto']
      }],
      /**
       * Content
       * @see https://tailwindcss.com/docs/content
       */
      content: [{
        content: ['none', isArbitraryVariable, isArbitraryValue]
      }],
      // -------------------
      // --- Backgrounds ---
      // -------------------
      /**
       * Background Attachment
       * @see https://tailwindcss.com/docs/background-attachment
       */
      'bg-attachment': [{
        bg: ['fixed', 'local', 'scroll']
      }],
      /**
       * Background Clip
       * @see https://tailwindcss.com/docs/background-clip
       */
      'bg-clip': [{
        'bg-clip': ['border', 'padding', 'content', 'text']
      }],
      /**
       * Background Origin
       * @see https://tailwindcss.com/docs/background-origin
       */
      'bg-origin': [{
        'bg-origin': ['border', 'padding', 'content']
      }],
      /**
       * Background Position
       * @see https://tailwindcss.com/docs/background-position
       */
      'bg-position': [{
        bg: scaleBgPosition()
      }],
      /**
       * Background Repeat
       * @see https://tailwindcss.com/docs/background-repeat
       */
      'bg-repeat': [{
        bg: scaleBgRepeat()
      }],
      /**
       * Background Size
       * @see https://tailwindcss.com/docs/background-size
       */
      'bg-size': [{
        bg: scaleBgSize()
      }],
      /**
       * Background Image
       * @see https://tailwindcss.com/docs/background-image
       */
      'bg-image': [{
        bg: ['none', {
          linear: [{
            to: ['t', 'tr', 'r', 'br', 'b', 'bl', 'l', 'tl']
          }, isInteger, isArbitraryVariable, isArbitraryValue],
          radial: ['', isArbitraryVariable, isArbitraryValue],
          conic: [isInteger, isArbitraryVariable, isArbitraryValue]
        }, isArbitraryVariableImage, isArbitraryImage]
      }],
      /**
       * Background Color
       * @see https://tailwindcss.com/docs/background-color
       */
      'bg-color': [{
        bg: scaleColor()
      }],
      /**
       * Gradient Color Stops From Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      'gradient-from-pos': [{
        from: scaleGradientStopPosition()
      }],
      /**
       * Gradient Color Stops Via Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      'gradient-via-pos': [{
        via: scaleGradientStopPosition()
      }],
      /**
       * Gradient Color Stops To Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      'gradient-to-pos': [{
        to: scaleGradientStopPosition()
      }],
      /**
       * Gradient Color Stops From
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      'gradient-from': [{
        from: scaleColor()
      }],
      /**
       * Gradient Color Stops Via
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      'gradient-via': [{
        via: scaleColor()
      }],
      /**
       * Gradient Color Stops To
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      'gradient-to': [{
        to: scaleColor()
      }],
      // ---------------
      // --- Borders ---
      // ---------------
      /**
       * Border Radius
       * @see https://tailwindcss.com/docs/border-radius
       */
      rounded: [{
        rounded: scaleRadius()
      }],
      /**
       * Border Radius Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      'rounded-s': [{
        'rounded-s': scaleRadius()
      }],
      /**
       * Border Radius End
       * @see https://tailwindcss.com/docs/border-radius
       */
      'rounded-e': [{
        'rounded-e': scaleRadius()
      }],
      /**
       * Border Radius Top
       * @see https://tailwindcss.com/docs/border-radius
       */
      'rounded-t': [{
        'rounded-t': scaleRadius()
      }],
      /**
       * Border Radius Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      'rounded-r': [{
        'rounded-r': scaleRadius()
      }],
      /**
       * Border Radius Bottom
       * @see https://tailwindcss.com/docs/border-radius
       */
      'rounded-b': [{
        'rounded-b': scaleRadius()
      }],
      /**
       * Border Radius Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      'rounded-l': [{
        'rounded-l': scaleRadius()
      }],
      /**
       * Border Radius Start Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      'rounded-ss': [{
        'rounded-ss': scaleRadius()
      }],
      /**
       * Border Radius Start End
       * @see https://tailwindcss.com/docs/border-radius
       */
      'rounded-se': [{
        'rounded-se': scaleRadius()
      }],
      /**
       * Border Radius End End
       * @see https://tailwindcss.com/docs/border-radius
       */
      'rounded-ee': [{
        'rounded-ee': scaleRadius()
      }],
      /**
       * Border Radius End Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      'rounded-es': [{
        'rounded-es': scaleRadius()
      }],
      /**
       * Border Radius Top Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      'rounded-tl': [{
        'rounded-tl': scaleRadius()
      }],
      /**
       * Border Radius Top Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      'rounded-tr': [{
        'rounded-tr': scaleRadius()
      }],
      /**
       * Border Radius Bottom Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      'rounded-br': [{
        'rounded-br': scaleRadius()
      }],
      /**
       * Border Radius Bottom Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      'rounded-bl': [{
        'rounded-bl': scaleRadius()
      }],
      /**
       * Border Width
       * @see https://tailwindcss.com/docs/border-width
       */
      'border-w': [{
        border: scaleBorderWidth()
      }],
      /**
       * Border Width X
       * @see https://tailwindcss.com/docs/border-width
       */
      'border-w-x': [{
        'border-x': scaleBorderWidth()
      }],
      /**
       * Border Width Y
       * @see https://tailwindcss.com/docs/border-width
       */
      'border-w-y': [{
        'border-y': scaleBorderWidth()
      }],
      /**
       * Border Width Start
       * @see https://tailwindcss.com/docs/border-width
       */
      'border-w-s': [{
        'border-s': scaleBorderWidth()
      }],
      /**
       * Border Width End
       * @see https://tailwindcss.com/docs/border-width
       */
      'border-w-e': [{
        'border-e': scaleBorderWidth()
      }],
      /**
       * Border Width Top
       * @see https://tailwindcss.com/docs/border-width
       */
      'border-w-t': [{
        'border-t': scaleBorderWidth()
      }],
      /**
       * Border Width Right
       * @see https://tailwindcss.com/docs/border-width
       */
      'border-w-r': [{
        'border-r': scaleBorderWidth()
      }],
      /**
       * Border Width Bottom
       * @see https://tailwindcss.com/docs/border-width
       */
      'border-w-b': [{
        'border-b': scaleBorderWidth()
      }],
      /**
       * Border Width Left
       * @see https://tailwindcss.com/docs/border-width
       */
      'border-w-l': [{
        'border-l': scaleBorderWidth()
      }],
      /**
       * Divide Width X
       * @see https://tailwindcss.com/docs/border-width#between-children
       */
      'divide-x': [{
        'divide-x': scaleBorderWidth()
      }],
      /**
       * Divide Width X Reverse
       * @see https://tailwindcss.com/docs/border-width#between-children
       */
      'divide-x-reverse': ['divide-x-reverse'],
      /**
       * Divide Width Y
       * @see https://tailwindcss.com/docs/border-width#between-children
       */
      'divide-y': [{
        'divide-y': scaleBorderWidth()
      }],
      /**
       * Divide Width Y Reverse
       * @see https://tailwindcss.com/docs/border-width#between-children
       */
      'divide-y-reverse': ['divide-y-reverse'],
      /**
       * Border Style
       * @see https://tailwindcss.com/docs/border-style
       */
      'border-style': [{
        border: [...scaleLineStyle(), 'hidden', 'none']
      }],
      /**
       * Divide Style
       * @see https://tailwindcss.com/docs/border-style#setting-the-divider-style
       */
      'divide-style': [{
        divide: [...scaleLineStyle(), 'hidden', 'none']
      }],
      /**
       * Border Color
       * @see https://tailwindcss.com/docs/border-color
       */
      'border-color': [{
        border: scaleColor()
      }],
      /**
       * Border Color X
       * @see https://tailwindcss.com/docs/border-color
       */
      'border-color-x': [{
        'border-x': scaleColor()
      }],
      /**
       * Border Color Y
       * @see https://tailwindcss.com/docs/border-color
       */
      'border-color-y': [{
        'border-y': scaleColor()
      }],
      /**
       * Border Color S
       * @see https://tailwindcss.com/docs/border-color
       */
      'border-color-s': [{
        'border-s': scaleColor()
      }],
      /**
       * Border Color E
       * @see https://tailwindcss.com/docs/border-color
       */
      'border-color-e': [{
        'border-e': scaleColor()
      }],
      /**
       * Border Color Top
       * @see https://tailwindcss.com/docs/border-color
       */
      'border-color-t': [{
        'border-t': scaleColor()
      }],
      /**
       * Border Color Right
       * @see https://tailwindcss.com/docs/border-color
       */
      'border-color-r': [{
        'border-r': scaleColor()
      }],
      /**
       * Border Color Bottom
       * @see https://tailwindcss.com/docs/border-color
       */
      'border-color-b': [{
        'border-b': scaleColor()
      }],
      /**
       * Border Color Left
       * @see https://tailwindcss.com/docs/border-color
       */
      'border-color-l': [{
        'border-l': scaleColor()
      }],
      /**
       * Divide Color
       * @see https://tailwindcss.com/docs/divide-color
       */
      'divide-color': [{
        divide: scaleColor()
      }],
      /**
       * Outline Style
       * @see https://tailwindcss.com/docs/outline-style
       */
      'outline-style': [{
        outline: [...scaleLineStyle(), 'none', 'hidden']
      }],
      /**
       * Outline Offset
       * @see https://tailwindcss.com/docs/outline-offset
       */
      'outline-offset': [{
        'outline-offset': [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Outline Width
       * @see https://tailwindcss.com/docs/outline-width
       */
      'outline-w': [{
        outline: ['', isNumber, isArbitraryVariableLength, isArbitraryLength]
      }],
      /**
       * Outline Color
       * @see https://tailwindcss.com/docs/outline-color
       */
      'outline-color': [{
        outline: scaleColor()
      }],
      // ---------------
      // --- Effects ---
      // ---------------
      /**
       * Box Shadow
       * @see https://tailwindcss.com/docs/box-shadow
       */
      shadow: [{
        shadow: [
        // Deprecated since Tailwind CSS v4.0.0
        '', 'none', themeShadow, isArbitraryVariableShadow, isArbitraryShadow]
      }],
      /**
       * Box Shadow Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-shadow-color
       */
      'shadow-color': [{
        shadow: scaleColor()
      }],
      /**
       * Inset Box Shadow
       * @see https://tailwindcss.com/docs/box-shadow#adding-an-inset-shadow
       */
      'inset-shadow': [{
        'inset-shadow': ['none', themeInsetShadow, isArbitraryVariableShadow, isArbitraryShadow]
      }],
      /**
       * Inset Box Shadow Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-inset-shadow-color
       */
      'inset-shadow-color': [{
        'inset-shadow': scaleColor()
      }],
      /**
       * Ring Width
       * @see https://tailwindcss.com/docs/box-shadow#adding-a-ring
       */
      'ring-w': [{
        ring: scaleBorderWidth()
      }],
      /**
       * Ring Width Inset
       * @see https://v3.tailwindcss.com/docs/ring-width#inset-rings
       * @deprecated since Tailwind CSS v4.0.0
       * @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
       */
      'ring-w-inset': ['ring-inset'],
      /**
       * Ring Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-ring-color
       */
      'ring-color': [{
        ring: scaleColor()
      }],
      /**
       * Ring Offset Width
       * @see https://v3.tailwindcss.com/docs/ring-offset-width
       * @deprecated since Tailwind CSS v4.0.0
       * @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
       */
      'ring-offset-w': [{
        'ring-offset': [isNumber, isArbitraryLength]
      }],
      /**
       * Ring Offset Color
       * @see https://v3.tailwindcss.com/docs/ring-offset-color
       * @deprecated since Tailwind CSS v4.0.0
       * @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
       */
      'ring-offset-color': [{
        'ring-offset': scaleColor()
      }],
      /**
       * Inset Ring Width
       * @see https://tailwindcss.com/docs/box-shadow#adding-an-inset-ring
       */
      'inset-ring-w': [{
        'inset-ring': scaleBorderWidth()
      }],
      /**
       * Inset Ring Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-inset-ring-color
       */
      'inset-ring-color': [{
        'inset-ring': scaleColor()
      }],
      /**
       * Text Shadow
       * @see https://tailwindcss.com/docs/text-shadow
       */
      'text-shadow': [{
        'text-shadow': ['none', themeTextShadow, isArbitraryVariableShadow, isArbitraryShadow]
      }],
      /**
       * Text Shadow Color
       * @see https://tailwindcss.com/docs/text-shadow#setting-the-shadow-color
       */
      'text-shadow-color': [{
        'text-shadow': scaleColor()
      }],
      /**
       * Opacity
       * @see https://tailwindcss.com/docs/opacity
       */
      opacity: [{
        opacity: [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Mix Blend Mode
       * @see https://tailwindcss.com/docs/mix-blend-mode
       */
      'mix-blend': [{
        'mix-blend': [...scaleBlendMode(), 'plus-darker', 'plus-lighter']
      }],
      /**
       * Background Blend Mode
       * @see https://tailwindcss.com/docs/background-blend-mode
       */
      'bg-blend': [{
        'bg-blend': scaleBlendMode()
      }],
      /**
       * Mask Clip
       * @see https://tailwindcss.com/docs/mask-clip
       */
      'mask-clip': [{
        'mask-clip': ['border', 'padding', 'content', 'fill', 'stroke', 'view']
      }, 'mask-no-clip'],
      /**
       * Mask Composite
       * @see https://tailwindcss.com/docs/mask-composite
       */
      'mask-composite': [{
        mask: ['add', 'subtract', 'intersect', 'exclude']
      }],
      /**
       * Mask Image
       * @see https://tailwindcss.com/docs/mask-image
       */
      'mask-image-linear-pos': [{
        'mask-linear': [isNumber]
      }],
      'mask-image-linear-from-pos': [{
        'mask-linear-from': scaleMaskImagePosition()
      }],
      'mask-image-linear-to-pos': [{
        'mask-linear-to': scaleMaskImagePosition()
      }],
      'mask-image-linear-from-color': [{
        'mask-linear-from': scaleColor()
      }],
      'mask-image-linear-to-color': [{
        'mask-linear-to': scaleColor()
      }],
      'mask-image-t-from-pos': [{
        'mask-t-from': scaleMaskImagePosition()
      }],
      'mask-image-t-to-pos': [{
        'mask-t-to': scaleMaskImagePosition()
      }],
      'mask-image-t-from-color': [{
        'mask-t-from': scaleColor()
      }],
      'mask-image-t-to-color': [{
        'mask-t-to': scaleColor()
      }],
      'mask-image-r-from-pos': [{
        'mask-r-from': scaleMaskImagePosition()
      }],
      'mask-image-r-to-pos': [{
        'mask-r-to': scaleMaskImagePosition()
      }],
      'mask-image-r-from-color': [{
        'mask-r-from': scaleColor()
      }],
      'mask-image-r-to-color': [{
        'mask-r-to': scaleColor()
      }],
      'mask-image-b-from-pos': [{
        'mask-b-from': scaleMaskImagePosition()
      }],
      'mask-image-b-to-pos': [{
        'mask-b-to': scaleMaskImagePosition()
      }],
      'mask-image-b-from-color': [{
        'mask-b-from': scaleColor()
      }],
      'mask-image-b-to-color': [{
        'mask-b-to': scaleColor()
      }],
      'mask-image-l-from-pos': [{
        'mask-l-from': scaleMaskImagePosition()
      }],
      'mask-image-l-to-pos': [{
        'mask-l-to': scaleMaskImagePosition()
      }],
      'mask-image-l-from-color': [{
        'mask-l-from': scaleColor()
      }],
      'mask-image-l-to-color': [{
        'mask-l-to': scaleColor()
      }],
      'mask-image-x-from-pos': [{
        'mask-x-from': scaleMaskImagePosition()
      }],
      'mask-image-x-to-pos': [{
        'mask-x-to': scaleMaskImagePosition()
      }],
      'mask-image-x-from-color': [{
        'mask-x-from': scaleColor()
      }],
      'mask-image-x-to-color': [{
        'mask-x-to': scaleColor()
      }],
      'mask-image-y-from-pos': [{
        'mask-y-from': scaleMaskImagePosition()
      }],
      'mask-image-y-to-pos': [{
        'mask-y-to': scaleMaskImagePosition()
      }],
      'mask-image-y-from-color': [{
        'mask-y-from': scaleColor()
      }],
      'mask-image-y-to-color': [{
        'mask-y-to': scaleColor()
      }],
      'mask-image-radial': [{
        'mask-radial': [isArbitraryVariable, isArbitraryValue]
      }],
      'mask-image-radial-from-pos': [{
        'mask-radial-from': scaleMaskImagePosition()
      }],
      'mask-image-radial-to-pos': [{
        'mask-radial-to': scaleMaskImagePosition()
      }],
      'mask-image-radial-from-color': [{
        'mask-radial-from': scaleColor()
      }],
      'mask-image-radial-to-color': [{
        'mask-radial-to': scaleColor()
      }],
      'mask-image-radial-shape': [{
        'mask-radial': ['circle', 'ellipse']
      }],
      'mask-image-radial-size': [{
        'mask-radial': [{
          closest: ['side', 'corner'],
          farthest: ['side', 'corner']
        }]
      }],
      'mask-image-radial-pos': [{
        'mask-radial-at': scalePosition()
      }],
      'mask-image-conic-pos': [{
        'mask-conic': [isNumber]
      }],
      'mask-image-conic-from-pos': [{
        'mask-conic-from': scaleMaskImagePosition()
      }],
      'mask-image-conic-to-pos': [{
        'mask-conic-to': scaleMaskImagePosition()
      }],
      'mask-image-conic-from-color': [{
        'mask-conic-from': scaleColor()
      }],
      'mask-image-conic-to-color': [{
        'mask-conic-to': scaleColor()
      }],
      /**
       * Mask Mode
       * @see https://tailwindcss.com/docs/mask-mode
       */
      'mask-mode': [{
        mask: ['alpha', 'luminance', 'match']
      }],
      /**
       * Mask Origin
       * @see https://tailwindcss.com/docs/mask-origin
       */
      'mask-origin': [{
        'mask-origin': ['border', 'padding', 'content', 'fill', 'stroke', 'view']
      }],
      /**
       * Mask Position
       * @see https://tailwindcss.com/docs/mask-position
       */
      'mask-position': [{
        mask: scaleBgPosition()
      }],
      /**
       * Mask Repeat
       * @see https://tailwindcss.com/docs/mask-repeat
       */
      'mask-repeat': [{
        mask: scaleBgRepeat()
      }],
      /**
       * Mask Size
       * @see https://tailwindcss.com/docs/mask-size
       */
      'mask-size': [{
        mask: scaleBgSize()
      }],
      /**
       * Mask Type
       * @see https://tailwindcss.com/docs/mask-type
       */
      'mask-type': [{
        'mask-type': ['alpha', 'luminance']
      }],
      /**
       * Mask Image
       * @see https://tailwindcss.com/docs/mask-image
       */
      'mask-image': [{
        mask: ['none', isArbitraryVariable, isArbitraryValue]
      }],
      // ---------------
      // --- Filters ---
      // ---------------
      /**
       * Filter
       * @see https://tailwindcss.com/docs/filter
       */
      filter: [{
        filter: [
        // Deprecated since Tailwind CSS v3.0.0
        '', 'none', isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Blur
       * @see https://tailwindcss.com/docs/blur
       */
      blur: [{
        blur: scaleBlur()
      }],
      /**
       * Brightness
       * @see https://tailwindcss.com/docs/brightness
       */
      brightness: [{
        brightness: [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Contrast
       * @see https://tailwindcss.com/docs/contrast
       */
      contrast: [{
        contrast: [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Drop Shadow
       * @see https://tailwindcss.com/docs/drop-shadow
       */
      'drop-shadow': [{
        'drop-shadow': [
        // Deprecated since Tailwind CSS v4.0.0
        '', 'none', themeDropShadow, isArbitraryVariableShadow, isArbitraryShadow]
      }],
      /**
       * Drop Shadow Color
       * @see https://tailwindcss.com/docs/filter-drop-shadow#setting-the-shadow-color
       */
      'drop-shadow-color': [{
        'drop-shadow': scaleColor()
      }],
      /**
       * Grayscale
       * @see https://tailwindcss.com/docs/grayscale
       */
      grayscale: [{
        grayscale: ['', isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Hue Rotate
       * @see https://tailwindcss.com/docs/hue-rotate
       */
      'hue-rotate': [{
        'hue-rotate': [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Invert
       * @see https://tailwindcss.com/docs/invert
       */
      invert: [{
        invert: ['', isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Saturate
       * @see https://tailwindcss.com/docs/saturate
       */
      saturate: [{
        saturate: [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Sepia
       * @see https://tailwindcss.com/docs/sepia
       */
      sepia: [{
        sepia: ['', isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Filter
       * @see https://tailwindcss.com/docs/backdrop-filter
       */
      'backdrop-filter': [{
        'backdrop-filter': [
        // Deprecated since Tailwind CSS v3.0.0
        '', 'none', isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Blur
       * @see https://tailwindcss.com/docs/backdrop-blur
       */
      'backdrop-blur': [{
        'backdrop-blur': scaleBlur()
      }],
      /**
       * Backdrop Brightness
       * @see https://tailwindcss.com/docs/backdrop-brightness
       */
      'backdrop-brightness': [{
        'backdrop-brightness': [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Contrast
       * @see https://tailwindcss.com/docs/backdrop-contrast
       */
      'backdrop-contrast': [{
        'backdrop-contrast': [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Grayscale
       * @see https://tailwindcss.com/docs/backdrop-grayscale
       */
      'backdrop-grayscale': [{
        'backdrop-grayscale': ['', isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Hue Rotate
       * @see https://tailwindcss.com/docs/backdrop-hue-rotate
       */
      'backdrop-hue-rotate': [{
        'backdrop-hue-rotate': [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Invert
       * @see https://tailwindcss.com/docs/backdrop-invert
       */
      'backdrop-invert': [{
        'backdrop-invert': ['', isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Opacity
       * @see https://tailwindcss.com/docs/backdrop-opacity
       */
      'backdrop-opacity': [{
        'backdrop-opacity': [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Saturate
       * @see https://tailwindcss.com/docs/backdrop-saturate
       */
      'backdrop-saturate': [{
        'backdrop-saturate': [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Sepia
       * @see https://tailwindcss.com/docs/backdrop-sepia
       */
      'backdrop-sepia': [{
        'backdrop-sepia': ['', isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      // --------------
      // --- Tables ---
      // --------------
      /**
       * Border Collapse
       * @see https://tailwindcss.com/docs/border-collapse
       */
      'border-collapse': [{
        border: ['collapse', 'separate']
      }],
      /**
       * Border Spacing
       * @see https://tailwindcss.com/docs/border-spacing
       */
      'border-spacing': [{
        'border-spacing': scaleUnambiguousSpacing()
      }],
      /**
       * Border Spacing X
       * @see https://tailwindcss.com/docs/border-spacing
       */
      'border-spacing-x': [{
        'border-spacing-x': scaleUnambiguousSpacing()
      }],
      /**
       * Border Spacing Y
       * @see https://tailwindcss.com/docs/border-spacing
       */
      'border-spacing-y': [{
        'border-spacing-y': scaleUnambiguousSpacing()
      }],
      /**
       * Table Layout
       * @see https://tailwindcss.com/docs/table-layout
       */
      'table-layout': [{
        table: ['auto', 'fixed']
      }],
      /**
       * Caption Side
       * @see https://tailwindcss.com/docs/caption-side
       */
      caption: [{
        caption: ['top', 'bottom']
      }],
      // ---------------------------------
      // --- Transitions and Animation ---
      // ---------------------------------
      /**
       * Transition Property
       * @see https://tailwindcss.com/docs/transition-property
       */
      transition: [{
        transition: ['', 'all', 'colors', 'opacity', 'shadow', 'transform', 'none', isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Transition Behavior
       * @see https://tailwindcss.com/docs/transition-behavior
       */
      'transition-behavior': [{
        transition: ['normal', 'discrete']
      }],
      /**
       * Transition Duration
       * @see https://tailwindcss.com/docs/transition-duration
       */
      duration: [{
        duration: [isNumber, 'initial', isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Transition Timing Function
       * @see https://tailwindcss.com/docs/transition-timing-function
       */
      ease: [{
        ease: ['linear', 'initial', themeEase, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Transition Delay
       * @see https://tailwindcss.com/docs/transition-delay
       */
      delay: [{
        delay: [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Animation
       * @see https://tailwindcss.com/docs/animation
       */
      animate: [{
        animate: ['none', themeAnimate, isArbitraryVariable, isArbitraryValue]
      }],
      // ------------------
      // --- Transforms ---
      // ------------------
      /**
       * Backface Visibility
       * @see https://tailwindcss.com/docs/backface-visibility
       */
      backface: [{
        backface: ['hidden', 'visible']
      }],
      /**
       * Perspective
       * @see https://tailwindcss.com/docs/perspective
       */
      perspective: [{
        perspective: [themePerspective, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Perspective Origin
       * @see https://tailwindcss.com/docs/perspective-origin
       */
      'perspective-origin': [{
        'perspective-origin': scalePositionWithArbitrary()
      }],
      /**
       * Rotate
       * @see https://tailwindcss.com/docs/rotate
       */
      rotate: [{
        rotate: scaleRotate()
      }],
      /**
       * Rotate X
       * @see https://tailwindcss.com/docs/rotate
       */
      'rotate-x': [{
        'rotate-x': scaleRotate()
      }],
      /**
       * Rotate Y
       * @see https://tailwindcss.com/docs/rotate
       */
      'rotate-y': [{
        'rotate-y': scaleRotate()
      }],
      /**
       * Rotate Z
       * @see https://tailwindcss.com/docs/rotate
       */
      'rotate-z': [{
        'rotate-z': scaleRotate()
      }],
      /**
       * Scale
       * @see https://tailwindcss.com/docs/scale
       */
      scale: [{
        scale: scaleScale()
      }],
      /**
       * Scale X
       * @see https://tailwindcss.com/docs/scale
       */
      'scale-x': [{
        'scale-x': scaleScale()
      }],
      /**
       * Scale Y
       * @see https://tailwindcss.com/docs/scale
       */
      'scale-y': [{
        'scale-y': scaleScale()
      }],
      /**
       * Scale Z
       * @see https://tailwindcss.com/docs/scale
       */
      'scale-z': [{
        'scale-z': scaleScale()
      }],
      /**
       * Scale 3D
       * @see https://tailwindcss.com/docs/scale
       */
      'scale-3d': ['scale-3d'],
      /**
       * Skew
       * @see https://tailwindcss.com/docs/skew
       */
      skew: [{
        skew: scaleSkew()
      }],
      /**
       * Skew X
       * @see https://tailwindcss.com/docs/skew
       */
      'skew-x': [{
        'skew-x': scaleSkew()
      }],
      /**
       * Skew Y
       * @see https://tailwindcss.com/docs/skew
       */
      'skew-y': [{
        'skew-y': scaleSkew()
      }],
      /**
       * Transform
       * @see https://tailwindcss.com/docs/transform
       */
      transform: [{
        transform: [isArbitraryVariable, isArbitraryValue, '', 'none', 'gpu', 'cpu']
      }],
      /**
       * Transform Origin
       * @see https://tailwindcss.com/docs/transform-origin
       */
      'transform-origin': [{
        origin: scalePositionWithArbitrary()
      }],
      /**
       * Transform Style
       * @see https://tailwindcss.com/docs/transform-style
       */
      'transform-style': [{
        transform: ['3d', 'flat']
      }],
      /**
       * Translate
       * @see https://tailwindcss.com/docs/translate
       */
      translate: [{
        translate: scaleTranslate()
      }],
      /**
       * Translate X
       * @see https://tailwindcss.com/docs/translate
       */
      'translate-x': [{
        'translate-x': scaleTranslate()
      }],
      /**
       * Translate Y
       * @see https://tailwindcss.com/docs/translate
       */
      'translate-y': [{
        'translate-y': scaleTranslate()
      }],
      /**
       * Translate Z
       * @see https://tailwindcss.com/docs/translate
       */
      'translate-z': [{
        'translate-z': scaleTranslate()
      }],
      /**
       * Translate None
       * @see https://tailwindcss.com/docs/translate
       */
      'translate-none': ['translate-none'],
      // ---------------------
      // --- Interactivity ---
      // ---------------------
      /**
       * Accent Color
       * @see https://tailwindcss.com/docs/accent-color
       */
      accent: [{
        accent: scaleColor()
      }],
      /**
       * Appearance
       * @see https://tailwindcss.com/docs/appearance
       */
      appearance: [{
        appearance: ['none', 'auto']
      }],
      /**
       * Caret Color
       * @see https://tailwindcss.com/docs/just-in-time-mode#caret-color-utilities
       */
      'caret-color': [{
        caret: scaleColor()
      }],
      /**
       * Color Scheme
       * @see https://tailwindcss.com/docs/color-scheme
       */
      'color-scheme': [{
        scheme: ['normal', 'dark', 'light', 'light-dark', 'only-dark', 'only-light']
      }],
      /**
       * Cursor
       * @see https://tailwindcss.com/docs/cursor
       */
      cursor: [{
        cursor: ['auto', 'default', 'pointer', 'wait', 'text', 'move', 'help', 'not-allowed', 'none', 'context-menu', 'progress', 'cell', 'crosshair', 'vertical-text', 'alias', 'copy', 'no-drop', 'grab', 'grabbing', 'all-scroll', 'col-resize', 'row-resize', 'n-resize', 'e-resize', 's-resize', 'w-resize', 'ne-resize', 'nw-resize', 'se-resize', 'sw-resize', 'ew-resize', 'ns-resize', 'nesw-resize', 'nwse-resize', 'zoom-in', 'zoom-out', isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Field Sizing
       * @see https://tailwindcss.com/docs/field-sizing
       */
      'field-sizing': [{
        'field-sizing': ['fixed', 'content']
      }],
      /**
       * Pointer Events
       * @see https://tailwindcss.com/docs/pointer-events
       */
      'pointer-events': [{
        'pointer-events': ['auto', 'none']
      }],
      /**
       * Resize
       * @see https://tailwindcss.com/docs/resize
       */
      resize: [{
        resize: ['none', '', 'y', 'x']
      }],
      /**
       * Scroll Behavior
       * @see https://tailwindcss.com/docs/scroll-behavior
       */
      'scroll-behavior': [{
        scroll: ['auto', 'smooth']
      }],
      /**
       * Scroll Margin
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      'scroll-m': [{
        'scroll-m': scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin X
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      'scroll-mx': [{
        'scroll-mx': scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin Y
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      'scroll-my': [{
        'scroll-my': scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin Start
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      'scroll-ms': [{
        'scroll-ms': scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin End
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      'scroll-me': [{
        'scroll-me': scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin Top
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      'scroll-mt': [{
        'scroll-mt': scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin Right
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      'scroll-mr': [{
        'scroll-mr': scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin Bottom
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      'scroll-mb': [{
        'scroll-mb': scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin Left
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      'scroll-ml': [{
        'scroll-ml': scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      'scroll-p': [{
        'scroll-p': scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding X
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      'scroll-px': [{
        'scroll-px': scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding Y
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      'scroll-py': [{
        'scroll-py': scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding Start
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      'scroll-ps': [{
        'scroll-ps': scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding End
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      'scroll-pe': [{
        'scroll-pe': scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding Top
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      'scroll-pt': [{
        'scroll-pt': scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding Right
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      'scroll-pr': [{
        'scroll-pr': scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding Bottom
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      'scroll-pb': [{
        'scroll-pb': scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding Left
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      'scroll-pl': [{
        'scroll-pl': scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Snap Align
       * @see https://tailwindcss.com/docs/scroll-snap-align
       */
      'snap-align': [{
        snap: ['start', 'end', 'center', 'align-none']
      }],
      /**
       * Scroll Snap Stop
       * @see https://tailwindcss.com/docs/scroll-snap-stop
       */
      'snap-stop': [{
        snap: ['normal', 'always']
      }],
      /**
       * Scroll Snap Type
       * @see https://tailwindcss.com/docs/scroll-snap-type
       */
      'snap-type': [{
        snap: ['none', 'x', 'y', 'both']
      }],
      /**
       * Scroll Snap Type Strictness
       * @see https://tailwindcss.com/docs/scroll-snap-type
       */
      'snap-strictness': [{
        snap: ['mandatory', 'proximity']
      }],
      /**
       * Touch Action
       * @see https://tailwindcss.com/docs/touch-action
       */
      touch: [{
        touch: ['auto', 'none', 'manipulation']
      }],
      /**
       * Touch Action X
       * @see https://tailwindcss.com/docs/touch-action
       */
      'touch-x': [{
        'touch-pan': ['x', 'left', 'right']
      }],
      /**
       * Touch Action Y
       * @see https://tailwindcss.com/docs/touch-action
       */
      'touch-y': [{
        'touch-pan': ['y', 'up', 'down']
      }],
      /**
       * Touch Action Pinch Zoom
       * @see https://tailwindcss.com/docs/touch-action
       */
      'touch-pz': ['touch-pinch-zoom'],
      /**
       * User Select
       * @see https://tailwindcss.com/docs/user-select
       */
      select: [{
        select: ['none', 'text', 'all', 'auto']
      }],
      /**
       * Will Change
       * @see https://tailwindcss.com/docs/will-change
       */
      'will-change': [{
        'will-change': ['auto', 'scroll', 'contents', 'transform', isArbitraryVariable, isArbitraryValue]
      }],
      // -----------
      // --- SVG ---
      // -----------
      /**
       * Fill
       * @see https://tailwindcss.com/docs/fill
       */
      fill: [{
        fill: ['none', ...scaleColor()]
      }],
      /**
       * Stroke Width
       * @see https://tailwindcss.com/docs/stroke-width
       */
      'stroke-w': [{
        stroke: [isNumber, isArbitraryVariableLength, isArbitraryLength, isArbitraryNumber]
      }],
      /**
       * Stroke
       * @see https://tailwindcss.com/docs/stroke
       */
      stroke: [{
        stroke: ['none', ...scaleColor()]
      }],
      // ---------------------
      // --- Accessibility ---
      // ---------------------
      /**
       * Forced Color Adjust
       * @see https://tailwindcss.com/docs/forced-color-adjust
       */
      'forced-color-adjust': [{
        'forced-color-adjust': ['auto', 'none']
      }]
    },
    conflictingClassGroups: {
      overflow: ['overflow-x', 'overflow-y'],
      overscroll: ['overscroll-x', 'overscroll-y'],
      inset: ['inset-x', 'inset-y', 'start', 'end', 'top', 'right', 'bottom', 'left'],
      'inset-x': ['right', 'left'],
      'inset-y': ['top', 'bottom'],
      flex: ['basis', 'grow', 'shrink'],
      gap: ['gap-x', 'gap-y'],
      p: ['px', 'py', 'ps', 'pe', 'pt', 'pr', 'pb', 'pl'],
      px: ['pr', 'pl'],
      py: ['pt', 'pb'],
      m: ['mx', 'my', 'ms', 'me', 'mt', 'mr', 'mb', 'ml'],
      mx: ['mr', 'ml'],
      my: ['mt', 'mb'],
      size: ['w', 'h'],
      'font-size': ['leading'],
      'fvn-normal': ['fvn-ordinal', 'fvn-slashed-zero', 'fvn-figure', 'fvn-spacing', 'fvn-fraction'],
      'fvn-ordinal': ['fvn-normal'],
      'fvn-slashed-zero': ['fvn-normal'],
      'fvn-figure': ['fvn-normal'],
      'fvn-spacing': ['fvn-normal'],
      'fvn-fraction': ['fvn-normal'],
      'line-clamp': ['display', 'overflow'],
      rounded: ['rounded-s', 'rounded-e', 'rounded-t', 'rounded-r', 'rounded-b', 'rounded-l', 'rounded-ss', 'rounded-se', 'rounded-ee', 'rounded-es', 'rounded-tl', 'rounded-tr', 'rounded-br', 'rounded-bl'],
      'rounded-s': ['rounded-ss', 'rounded-es'],
      'rounded-e': ['rounded-se', 'rounded-ee'],
      'rounded-t': ['rounded-tl', 'rounded-tr'],
      'rounded-r': ['rounded-tr', 'rounded-br'],
      'rounded-b': ['rounded-br', 'rounded-bl'],
      'rounded-l': ['rounded-tl', 'rounded-bl'],
      'border-spacing': ['border-spacing-x', 'border-spacing-y'],
      'border-w': ['border-w-x', 'border-w-y', 'border-w-s', 'border-w-e', 'border-w-t', 'border-w-r', 'border-w-b', 'border-w-l'],
      'border-w-x': ['border-w-r', 'border-w-l'],
      'border-w-y': ['border-w-t', 'border-w-b'],
      'border-color': ['border-color-x', 'border-color-y', 'border-color-s', 'border-color-e', 'border-color-t', 'border-color-r', 'border-color-b', 'border-color-l'],
      'border-color-x': ['border-color-r', 'border-color-l'],
      'border-color-y': ['border-color-t', 'border-color-b'],
      translate: ['translate-x', 'translate-y', 'translate-none'],
      'translate-none': ['translate', 'translate-x', 'translate-y', 'translate-z'],
      'scroll-m': ['scroll-mx', 'scroll-my', 'scroll-ms', 'scroll-me', 'scroll-mt', 'scroll-mr', 'scroll-mb', 'scroll-ml'],
      'scroll-mx': ['scroll-mr', 'scroll-ml'],
      'scroll-my': ['scroll-mt', 'scroll-mb'],
      'scroll-p': ['scroll-px', 'scroll-py', 'scroll-ps', 'scroll-pe', 'scroll-pt', 'scroll-pr', 'scroll-pb', 'scroll-pl'],
      'scroll-px': ['scroll-pr', 'scroll-pl'],
      'scroll-py': ['scroll-pt', 'scroll-pb'],
      touch: ['touch-x', 'touch-y', 'touch-pz'],
      'touch-x': ['touch'],
      'touch-y': ['touch'],
      'touch-pz': ['touch']
    },
    conflictingClassGroupModifiers: {
      'font-size': ['leading']
    },
    orderSensitiveModifiers: ['*', '**', 'after', 'backdrop', 'before', 'details-content', 'file', 'first-letter', 'first-line', 'marker', 'placeholder', 'selection']
  };
};

/**
 * @param baseConfig Config where other config will be merged into. This object will be mutated.
 * @param configExtension Partial config to merge into the `baseConfig`.
 */
const mergeConfigs = (baseConfig, {
  cacheSize,
  prefix,
  experimentalParseClassName,
  extend = {},
  override = {}
}) => {
  overrideProperty(baseConfig, 'cacheSize', cacheSize);
  overrideProperty(baseConfig, 'prefix', prefix);
  overrideProperty(baseConfig, 'experimentalParseClassName', experimentalParseClassName);
  overrideConfigProperties(baseConfig.theme, override.theme);
  overrideConfigProperties(baseConfig.classGroups, override.classGroups);
  overrideConfigProperties(baseConfig.conflictingClassGroups, override.conflictingClassGroups);
  overrideConfigProperties(baseConfig.conflictingClassGroupModifiers, override.conflictingClassGroupModifiers);
  overrideProperty(baseConfig, 'orderSensitiveModifiers', override.orderSensitiveModifiers);
  mergeConfigProperties(baseConfig.theme, extend.theme);
  mergeConfigProperties(baseConfig.classGroups, extend.classGroups);
  mergeConfigProperties(baseConfig.conflictingClassGroups, extend.conflictingClassGroups);
  mergeConfigProperties(baseConfig.conflictingClassGroupModifiers, extend.conflictingClassGroupModifiers);
  mergeArrayProperties(baseConfig, extend, 'orderSensitiveModifiers');
  return baseConfig;
};
const overrideProperty = (baseObject, overrideKey, overrideValue) => {
  if (overrideValue !== undefined) {
    baseObject[overrideKey] = overrideValue;
  }
};
const overrideConfigProperties = (baseObject, overrideObject) => {
  if (overrideObject) {
    for (const key in overrideObject) {
      overrideProperty(baseObject, key, overrideObject[key]);
    }
  }
};
const mergeConfigProperties = (baseObject, mergeObject) => {
  if (mergeObject) {
    for (const key in mergeObject) {
      mergeArrayProperties(baseObject, mergeObject, key);
    }
  }
};
const mergeArrayProperties = (baseObject, mergeObject, key) => {
  const mergeValue = mergeObject[key];
  if (mergeValue !== undefined) {
    baseObject[key] = baseObject[key] ? baseObject[key].concat(mergeValue) : mergeValue;
  }
};
const extendTailwindMerge = (configExtension, ...createConfig) => typeof configExtension === 'function' ? createTailwindMerge(getDefaultConfig, configExtension, ...createConfig) : createTailwindMerge(() => mergeConfigs(getDefaultConfig(), configExtension), ...createConfig);
const twMerge = /*#__PURE__*/createTailwindMerge(getDefaultConfig);

//# sourceMappingURL=bundle-mjs.mjs.map


/***/ }),

/***/ "./src/lib/tools/browser/snapshot.ts":
/*!*******************************************!*\
  !*** ./src/lib/tools/browser/snapshot.ts ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   snapshot: () => (/* binding */ snapshot)
/* harmony export */ });
/* harmony import */ var _lib_utils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @/lib/utils */ "./src/lib/utils.ts");
/**
 * Snapshot tool for capturing accessibility snapshot of the current page
 * This tool captures an accessibility snapshot which is better than screenshot
 * as it provides DOM structure and element references for automation
 *
 * @returns Promise with success status and snapshot data
 */

/**
 * Captures an accessibility snapshot of the current page in markdown format
 * matching the playwright-mcp implementation exactly
 */
async function snapshot() {
    const environment = (0,_lib_utils__WEBPACK_IMPORTED_MODULE_0__.detectEnvironment)();
    try {
        if (environment.useBackgroundProxy && typeof chrome !== 'undefined' && chrome.runtime) {
            // Use Chrome extension messaging for background script proxy
            return new Promise((resolve) => {
                const timeoutId = setTimeout(() => {
                    resolve({
                        success: false,
                        error: 'Snapshot request timed out'
                    });
                }, 30000);
                try {
                    chrome.runtime.sendMessage({ type: 'SNAPSHOT' }, (response) => {
                        clearTimeout(timeoutId);
                        if (chrome.runtime.lastError) {
                            resolve({
                                success: false,
                                error: chrome.runtime.lastError.message || 'Error communicating with background script'
                            });
                            return;
                        }
                        resolve(response);
                    });
                }
                catch (err) {
                    clearTimeout(timeoutId);
                    resolve({
                        success: false,
                        error: err instanceof Error ? err.message : String(err)
                    });
                }
            });
        }
        else {
            // Direct implementation for content script and sidepanel
            return await captureDirectSnapshot();
        }
    }
    catch (error) {
        console.error('Snapshot error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown snapshot error'
        };
    }
}
/**
 * Direct implementation of snapshot capture
 */
async function captureDirectSnapshot() {
    try {
        // Check if the extension context is still valid early on
        if (typeof chrome === 'undefined' || typeof chrome.runtime === 'undefined' || typeof chrome.runtime.id === 'undefined') {
            console.warn('[SnapshotTool] Extension context appears to be invalidated. Aborting direct snapshot.');
            return {
                success: false,
                error: 'Extension context invalidated during snapshot capture.'
            };
        }
        // Get page information
        const pageUrl = window.location.href;
        const pageTitle = document.title;
        // Generate the accessibility tree
        const accessibilityTree = await generateAccessibilityTree();
        // Format as YAML similar to playwright-mcp
        const yamlContent = formatAsYaml(accessibilityTree);
        // Create the complete markdown response matching playwright-mcp format
        const snapshot = [
            '- Ran Playwright code:',
            '```js',
            '// <internal code to capture accessibility snapshot>',
            '```',
            '',
            `- Page URL: ${pageUrl}`,
            `- Page Title: ${pageTitle}`,
            '- Page Snapshot',
            '```yaml',
            yamlContent,
            '```'
        ].join('\n');
        return {
            success: true,
            snapshot
        };
    }
    catch (error) {
        console.error('Direct snapshot error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to capture snapshot'
        };
    }
}
/**
 * Generate accessibility tree from the current page
 */
async function generateAccessibilityTree() {
    const refCounter = { value: 1 };
    const processedElements = new WeakSet();
    // Start from body or documentElement
    const rootElement = document.body || document.documentElement;
    if (!rootElement) {
        throw new Error('No root element found');
    }
    return buildAccessibilityTree(rootElement, refCounter, processedElements);
}
/**
 * Build accessibility tree recursively
 */
function buildAccessibilityTree(element, refCounter, processedElements, maxDepth = 10, currentDepth = 0) {
    if (currentDepth > maxDepth || processedElements.has(element)) {
        return [];
    }
    processedElements.add(element);
    const nodes = [];
    // Process current element if it's meaningful
    const node = createAccessibilityNode(element, refCounter);
    if (node) {
        nodes.push(node);
        // Process children for interactive/structural elements
        if (shouldProcessChildren(element)) {
            const children = [];
            // Process regular DOM children
            for (const child of Array.from(element.children)) {
                const childNodes = buildAccessibilityTree(child, refCounter, processedElements, maxDepth, currentDepth + 1);
                children.push(...childNodes);
            }
            // Process shadow DOM children if element has open shadow root
            if (element.shadowRoot && element.shadowRoot.mode === 'open') {
                for (const shadowChild of Array.from(element.shadowRoot.children)) {
                    const shadowNodes = buildAccessibilityTree(shadowChild, refCounter, processedElements, maxDepth, currentDepth + 1);
                    children.push(...shadowNodes);
                }
            }
            if (children.length > 0) {
                node.children = children;
            }
        }
    }
    else {
        // If current element isn't meaningful, process its children directly
        for (const child of Array.from(element.children)) {
            const childNodes = buildAccessibilityTree(child, refCounter, processedElements, maxDepth, currentDepth);
            nodes.push(...childNodes);
        }
        // Also process shadow DOM children if element has open shadow root
        if (element.shadowRoot && element.shadowRoot.mode === 'open') {
            for (const shadowChild of Array.from(element.shadowRoot.children)) {
                const shadowNodes = buildAccessibilityTree(shadowChild, refCounter, processedElements, maxDepth, currentDepth);
                nodes.push(...shadowNodes);
            }
        }
    }
    return nodes;
}
/**
 * Create accessibility node from element
 */
function createAccessibilityNode(element, refCounter) {
    const tagName = element.tagName.toLowerCase();
    const computedStyle = window.getComputedStyle(element);
    // Skip hidden elements
    if (computedStyle.display === 'none' ||
        computedStyle.visibility === 'hidden' ||
        computedStyle.opacity === '0') {
        return null;
    }
    // Skip very small elements (likely not interactive)
    const rect = element.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) {
        return null;
    }
    // Determine if this element should be included
    if (!shouldIncludeElement(element)) {
        return null;
    }
    // Get role (explicit or implicit)
    const role = getElementRole(element);
    // Get accessible name
    const name = getAccessibleName(element);
    // Create ref and assign to element
    const ref = `e${refCounter.value++}`;
    element.setAttribute('aria-ref', ref);
    // Get cursor style
    const cursor = computedStyle.cursor;
    const node = {
        role,
        element
    };
    if (name) {
        node.name = name;
    }
    node.ref = ref;
    if (cursor && cursor !== 'auto' && cursor !== 'default') {
        node.cursor = cursor;
    }
    return node;
}
/**
 * Determine if element should be included in accessibility tree
 */
function shouldIncludeElement(element) {
    const tagName = element.tagName.toLowerCase();
    // Always include interactive elements
    const interactiveElements = [
        'a', 'button', 'input', 'textarea', 'select', 'option',
        'details', 'summary', 'label', 'fieldset', 'legend'
    ];
    if (interactiveElements.includes(tagName)) {
        return true;
    }
    // Include elements with explicit roles
    if (element.hasAttribute('role')) {
        return true;
    }
    // Include elements with click handlers
    if (element.hasAttribute('onclick') || element.hasAttribute('ng-click')) {
        return true;
    }
    // Include headings
    if (/^h[1-6]$/.test(tagName)) {
        return true;
    }
    // Include structural elements with meaningful content
    const structuralElements = ['main', 'nav', 'aside', 'section', 'article', 'header', 'footer'];
    if (structuralElements.includes(tagName)) {
        return true;
    }
    // Include generic containers that might be clickable
    if (['div', 'span'].includes(tagName)) {
        const style = window.getComputedStyle(element);
        if (style.cursor === 'pointer' || element.hasAttribute('tabindex')) {
            return true;
        }
    }
    // Include images with alt text
    if (tagName === 'img' && element.hasAttribute('alt')) {
        return true;
    }
    return false;
}
/**
 * Determine if element's children should be processed
 */
function shouldProcessChildren(element) {
    const tagName = element.tagName.toLowerCase();
    // Don't process children of leaf elements
    const leafElements = ['input', 'textarea', 'img', 'br', 'hr'];
    if (leafElements.includes(tagName)) {
        return false;
    }
    // Process children of structural elements
    return true;
}
/**
 * Get element's role (explicit or implicit)
 */
function getElementRole(element) {
    // Check explicit role
    const explicitRole = element.getAttribute('role');
    if (explicitRole) {
        return explicitRole;
    }
    // Determine implicit role based on tag
    const tagName = element.tagName.toLowerCase();
    const roleMap = {
        'a': 'link',
        'button': 'button',
        'input': getInputRole(element),
        'textarea': 'textbox',
        'select': 'combobox',
        'option': 'option',
        'img': 'img',
        'h1': 'heading',
        'h2': 'heading',
        'h3': 'heading',
        'h4': 'heading',
        'h5': 'heading',
        'h6': 'heading',
        'main': 'main',
        'nav': 'navigation',
        'aside': 'complementary',
        'section': 'region',
        'article': 'article',
        'header': 'banner',
        'footer': 'contentinfo',
        'fieldset': 'group',
        'legend': 'legend',
        'label': 'label'
    };
    return roleMap[tagName] || 'generic';
}
/**
 * Get role for input elements based on type
 */
function getInputRole(input) {
    const type = (input.type || 'text').toLowerCase();
    const inputRoleMap = {
        'text': 'textbox',
        'email': 'textbox',
        'password': 'textbox',
        'search': 'searchbox',
        'tel': 'textbox',
        'url': 'textbox',
        'number': 'spinbutton',
        'range': 'slider',
        'checkbox': 'checkbox',
        'radio': 'radio',
        'button': 'button',
        'submit': 'button',
        'reset': 'button',
        'file': 'button'
    };
    return inputRoleMap[type] || 'textbox';
}
/**
 * Get accessible name for element
 */
function getAccessibleName(element) {
    try {
        // Check aria-label
        const ariaLabel = element.getAttribute('aria-label');
        if (ariaLabel) {
            return ariaLabel.trim();
        }
        // Check aria-labelledby
        const labelledBy = element.getAttribute('aria-labelledby');
        if (labelledBy) {
            const referencedElement = document.getElementById(labelledBy);
            if (referencedElement) {
                return getTextContent(referencedElement).trim();
            }
        }
        // For form controls, check associated label
        if (element instanceof HTMLInputElement ||
            element instanceof HTMLTextAreaElement ||
            element instanceof HTMLSelectElement) {
            // Check for label element
            const labels = document.querySelectorAll(`label[for="${element.id}"]`);
            if (labels.length > 0) {
                return getTextContent(labels[0]).trim();
            }
            // Check for wrapping label
            const wrappingLabel = element.closest('label');
            if (wrappingLabel) {
                return getTextContent(wrappingLabel).trim();
            }
            // Check placeholder
            const placeholder = element.getAttribute('placeholder');
            if (placeholder) {
                return placeholder.trim();
            }
        }
        // Check title attribute
        const title = element.getAttribute('title');
        if (title) {
            return title.trim();
        }
        // For images, check alt attribute
        if (element instanceof HTMLImageElement) {
            const alt = element.getAttribute('alt');
            if (alt) {
                return alt.trim();
            }
        }
        // Get text content for other elements
        const textContent = getTextContent(element).trim();
        if (textContent && textContent.length < 100) { // Reasonable length limit
            return textContent;
        }
        return '';
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('Extension context invalidated')) {
            console.warn('[SnapshotTool] Context invalidated while getting accessible name for element:', element, error.message);
        }
        else {
            console.warn('[SnapshotTool] Error getting accessible name for element:', element, error);
        }
        return ''; // Return empty string on error
    }
}
/**
 * Get text content, excluding text from child interactive elements
 */
function getTextContent(element) {
    try {
        const clone = element.cloneNode(true);
        // Remove child interactive elements to avoid nested labels
        const interactiveSelectors = [
            'button', 'a', 'input', 'textarea', 'select',
            '[role="button"]', '[role="link"]', '[role="textbox"]'
        ];
        for (const selector of interactiveSelectors) {
            const interactiveElements = clone.querySelectorAll(selector);
            interactiveElements.forEach(el => {
                try {
                    el.remove();
                }
                catch (removeError) {
                    // Log if a specific removal fails, possibly due to context issues with the cloned node
                    if (removeError instanceof Error && removeError.message.includes('Extension context invalidated')) {
                        console.warn('[SnapshotTool] Context invalidated while removing child from cloned node during getTextContent:', el, removeError.message);
                    }
                    else {
                        console.warn('[SnapshotTool] Error removing child from cloned node during getTextContent:', el, removeError);
                    }
                }
            });
        }
        return clone.textContent || '';
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('Extension context invalidated')) {
            console.warn('[SnapshotTool] Context invalidated during getTextContent for element:', element, error.message);
        }
        else {
            console.warn('[SnapshotTool] Error in getTextContent for element:', element, error);
        }
        return ''; // Return empty string on error
    }
}
/**
 * Format accessibility tree as YAML similar to playwright-mcp
 */
function formatAsYaml(nodes, indent = '') {
    const lines = [];
    for (const node of nodes) {
        let line = `${indent}- ${node.role}`;
        if (node.name) {
            line += ` "${node.name}"`;
        }
        if (node.ref) {
            line += ` [ref=${node.ref}]`;
        }
        if (node.cursor) {
            line += ` [cursor=${node.cursor}]`;
        }
        lines.push(line + ':');
        if (node.children && node.children.length > 0) {
            const childYaml = formatAsYaml(node.children, indent + '  ');
            lines.push(childYaml);
        }
    }
    return lines.join('\n');
}


/***/ }),

/***/ "./src/lib/utils.ts":
/*!**************************!*\
  !*** ./src/lib/utils.ts ***!
  \**************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   cn: () => (/* binding */ cn),
/* harmony export */   detectEnvironment: () => (/* binding */ detectEnvironment)
/* harmony export */ });
/* harmony import */ var clsx__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! clsx */ "./node_modules/clsx/dist/clsx.mjs");
/* harmony import */ var tailwind_merge__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! tailwind-merge */ "./node_modules/tailwind-merge/dist/bundle-mjs.mjs");


function cn(...inputs) {
    return (0,tailwind_merge__WEBPACK_IMPORTED_MODULE_1__.twMerge)((0,clsx__WEBPACK_IMPORTED_MODULE_0__.clsx)(inputs));
}
/**
 * Detects the current execution environment
 * @returns Information about the current environment
 */
function detectEnvironment() {
    const isBackground = typeof chrome !== 'undefined' &&
        chrome.runtime &&
        typeof chrome.runtime.getManifest === 'function' &&
        (chrome.extension?.getBackgroundPage?.() === window);
    const isExtension = typeof chrome !== 'undefined' &&
        chrome.runtime &&
        !!chrome.runtime.id;
    const isContentScript = isExtension &&
        !isBackground &&
        typeof document !== 'undefined';
    const isSidepanel = isExtension &&
        !isBackground &&
        typeof document !== 'undefined' &&
        window.location.pathname.includes('sidepanel.html');
    const isNodeJs = typeof window === 'undefined' &&
        typeof process !== 'undefined' &&
        !!process.versions &&
        !!process.versions.node;
    return {
        isBackground,
        isContentScript,
        isSidepanel,
        isExtension,
        isNodeJs,
        useBackgroundProxy: (isContentScript || isSidepanel) && !isBackground
    };
}


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!******************************!*\
  !*** ./src/content/index.ts ***!
  \******************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _lib_tools_browser_snapshot__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @/lib/tools/browser/snapshot */ "./src/lib/tools/browser/snapshot.ts");

// Singleton pattern to prevent multiple content script instances
const CONTENT_SCRIPT_ID = 'earth-engine-ai-assistant-content-script';
const INSTANCE_TIMESTAMP = Date.now();
// Immediately mark context as potentially invalid if we can't access chrome APIs
let isContextInvalidated = false;
try {
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
        console.warn('Chrome extension APIs not available, marking context as invalid');
        isContextInvalidated = true;
    }
}
catch (error) {
    console.warn('Error checking chrome APIs on startup:', error);
    isContextInvalidated = true;
}
// Exit immediately if context is invalid
if (isContextInvalidated) {
    console.log('Content script exiting due to invalid context');
    throw new Error('Extension context invalid on startup');
}
// Check if another instance is already running
if (window[CONTENT_SCRIPT_ID]) {
    const existingTimestamp = window[CONTENT_SCRIPT_ID];
    console.log(`Content script already running (timestamp: ${existingTimestamp}). Current timestamp: ${INSTANCE_TIMESTAMP}. Exiting this instance.`);
    // If this instance is newer, take over
    if (INSTANCE_TIMESTAMP > existingTimestamp) {
        console.log('This instance is newer, taking over...');
        // Clean up the old instance
        const oldPeriodicCheckId = window[CONTENT_SCRIPT_ID + '_intervalId'];
        if (oldPeriodicCheckId) {
            clearInterval(oldPeriodicCheckId);
            console.log('Cleared old periodic check interval');
        }
    }
    else {
        // Exit if an older or same instance is already running
        console.log('Exiting older/duplicate content script instance');
        throw new Error('Content script instance already running with same or newer timestamp');
    }
}
// Mark this instance as the active one
window[CONTENT_SCRIPT_ID] = INSTANCE_TIMESTAMP;
// Initialize content script immediately to catch messages early
console.log('Earth Engine AI Assistant content script loading at:', new Date().toISOString(), 'with timestamp:', INSTANCE_TIMESTAMP);
// Track connection status with background script
let backgroundConnectionVerified = false;
let notificationRetries = 0;
const MAX_NOTIFICATION_RETRIES = 5;
// Track the state of the content script
let backgroundConnected = false;
let connectionRetries = 0;
const MAX_CONNECTION_RETRIES = 5;
const CONNECTION_RETRY_DELAYS = [500, 1000, 2000, 4000, 8000]; // Exponential backoff
let periodicCheckIntervalId;
// Notify background script that content script is loaded
function notifyBackgroundScript() {
    // Check if extension context is valid before attempting communication
    try {
        if (typeof chrome === 'undefined' ||
            typeof chrome.runtime === 'undefined' ||
            typeof chrome.runtime.id === 'undefined') {
            console.warn('Extension context invalidated, cannot notify background script');
            isContextInvalidated = true;
            return;
        }
    }
    catch (error) {
        console.warn('Error checking extension context in notifyBackgroundScript:', error);
        isContextInvalidated = true;
        return;
    }
    if (isContextInvalidated) {
        console.log('Context already marked as invalidated, skipping background notification');
        return;
    }
    console.log('Notifying background script that content script is loaded...');
    try {
        chrome.runtime.sendMessage({
            type: 'CONTENT_SCRIPT_LOADED',
            url: window.location.href,
            timestamp: Date.now()
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.warn('Error notifying background script:', chrome.runtime.lastError);
                // Check for context invalidation
                if (chrome.runtime.lastError.message?.includes("Extension context invalidated")) {
                    console.error('Extension context invalidated during notification');
                    isContextInvalidated = true;
                    return;
                }
                // Retry with exponential backoff if we haven't reached max retries
                if (notificationRetries < MAX_NOTIFICATION_RETRIES) {
                    notificationRetries++;
                    const delay = Math.pow(2, notificationRetries) * 500; // Exponential backoff
                    console.log(`Retrying notification in ${delay}ms (attempt ${notificationRetries}/${MAX_NOTIFICATION_RETRIES})...`);
                    setTimeout(notifyBackgroundScript, delay);
                }
                return;
            }
            backgroundConnectionVerified = true;
            notificationRetries = 0;
            console.log('Content script loaded notification response:', response);
        });
    }
    catch (error) {
        console.error('Error sending notification message:', error);
        isContextInvalidated = true;
    }
}
// Track ping attempts to avoid infinite loops
let pingAttempts = 0;
const MAX_PING_ATTEMPTS = 3;
// Respond to ping checks from background script
function setupPingResponse() {
    // Create a specific handler for PING messages to increase reliability
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message && message.type === 'PING') {
            console.log('Received PING from background script, responding...');
            sendResponse({
                success: true,
                message: 'Content script is active',
                timestamp: Date.now(),
                url: window.location.href
            });
            // Reset ping attempts when a successful ping occurs
            pingAttempts = 0;
            backgroundConnectionVerified = true;
            return true;
        }
    });
}
// Update the message listener to handle the new message type
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (isContextInvalidated) {
        console.error('Content script context is invalidated. Aborting message handling for:', message.type);
        // It's tricky to know if we should return true or false here without knowing if sendResponse was originally going to be async.
        // Returning false is safer, but might leave some sendMessage calls in background hanging.
        // However, if context is invalidated, the background might not be there to receive a response anyway.
        return false;
    }
    if (!message || !message.type) {
        console.warn('Received invalid message:', message);
        sendResponse({ success: false, error: 'Invalid message format' });
        return false;
    }
    console.log(`Content script received message: ${message.type}`);
    try {
        switch (message.type) {
            case 'PING':
                sendResponse({ success: true, message: 'Earth Engine content script is active' });
                return false;
            case 'INIT':
                sendResponse({ success: true, message: 'Earth Engine content script is active' });
                return false;
            case 'RUN_CODE':
                handleRunCode(message.code || '', sendResponse);
                return true; // Will respond asynchronously
            case 'CHECK_CONSOLE':
                handleCheckConsole(sendResponse);
                return true; // Will respond asynchronously
            case 'INSPECT_MAP':
                handleInspectMap(message.coordinates, sendResponse);
                return true; // Will respond asynchronously
            case 'GET_TASKS':
                handleGetTasks(sendResponse);
                return true; // Will respond asynchronously
            case 'EDIT_SCRIPT':
                handleEditScript(message, sendResponse);
                return true; // Will respond asynchronously
            case 'GET_MAP_LAYERS':
                handleGetMapLayers(sendResponse);
                return true; // Will respond asynchronously
            case 'TAKE_ACCESSIBILITY_SNAPSHOT':
                handleTakeAccessibilitySnapshot(sendResponse);
                return true; // Will respond asynchronously
            case 'GET_ELEMENT_BY_REF_ID':
                if (message.payload && message.payload.refId) {
                    handleGetElementByRefId(message.payload.refId, sendResponse);
                }
                else {
                    sendResponse({ success: false, error: 'refId not provided in payload for GET_ELEMENT_BY_REF_ID' });
                }
                return true; // Will respond asynchronously
            case 'CLICK_BY_COORDINATES':
                if (message.payload && typeof message.payload.x === 'number' && typeof message.payload.y === 'number') {
                    handleExecuteClickByCoordinates(message.payload.x, message.payload.y, sendResponse);
                }
                else {
                    sendResponse({ success: false, error: 'Invalid payload for CLICK_BY_COORDINATES: x and y are required.' });
                }
                return true; // Will respond asynchronously
            case 'CLICK_BY_REF_ID':
                if (message.payload && message.payload.refId) {
                    handleClickByRefId(message.payload.refId, sendResponse);
                }
                else {
                    sendResponse({ success: false, error: 'refId not provided in payload for CLICK_BY_REF_ID' });
                }
                return true; // Will respond asynchronously
            default:
                console.warn(`Unknown message type: ${message.type}`);
                sendResponse({ success: false, error: `Unknown message type: ${message.type}` });
                return false;
        }
    }
    catch (error) {
        console.error(`Error handling message (${message.type}):`, error);
        sendResponse({
            success: false,
            error: `Error in content script: ${error instanceof Error ? error.message : String(error)}`
        });
        return false;
    }
});
// Also initialize when DOM content is loaded to make sure we have access to the page elements
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setupPingResponse();
        notifyBackgroundScript();
    });
}
else {
    setupPingResponse();
    notifyBackgroundScript();
}
// Also set up a periodic self-check to ensure registration
function periodicSelfCheck() {
    // First check if the extension context is still valid
    try {
        if (typeof chrome === 'undefined' ||
            typeof chrome.runtime === 'undefined' ||
            typeof chrome.runtime.id === 'undefined') {
            console.log('Extension context appears to be invalidated. Stopping periodic checks.');
            isContextInvalidated = true;
            if (periodicCheckIntervalId !== undefined) {
                clearInterval(periodicCheckIntervalId);
                periodicCheckIntervalId = undefined;
            }
            return;
        }
    }
    catch (error) {
        console.log('Error checking extension context, stopping periodic checks:', error instanceof Error ? error.message : String(error));
        isContextInvalidated = true;
        if (periodicCheckIntervalId !== undefined) {
            clearInterval(periodicCheckIntervalId);
            periodicCheckIntervalId = undefined;
        }
        return;
    }
    // Don't proceed if context was previously marked as invalidated
    if (isContextInvalidated) {
        console.log('Context already marked as invalidated, stopping periodic check');
        if (periodicCheckIntervalId !== undefined) {
            clearInterval(periodicCheckIntervalId);
            periodicCheckIntervalId = undefined;
        }
        return;
    }
    // Only send heartbeat if we haven't exceeded max attempts OR if background was previously verified
    if (pingAttempts < MAX_PING_ATTEMPTS || backgroundConnectionVerified) {
        pingAttempts++;
        try {
            // Send a self-ping to the background script
            chrome.runtime.sendMessage({
                type: 'CONTENT_SCRIPT_HEARTBEAT',
                url: window.location.href,
                timestamp: Date.now()
            }, (response) => {
                // CRITICAL: Check chrome.runtime.lastError immediately.
                if (chrome.runtime.lastError) {
                    // If context is invalidated, stop all further operations
                    if (chrome.runtime.lastError.message?.includes("Extension context invalidated")) {
                        console.log("Content script context invalidated during heartbeat. Stopping further operations.");
                        isContextInvalidated = true;
                        if (periodicCheckIntervalId !== undefined) {
                            clearInterval(periodicCheckIntervalId);
                            periodicCheckIntervalId = undefined;
                        }
                        backgroundConnectionVerified = false;
                        return;
                    }
                    // For other errors, just continue silently
                    return;
                }
                // If no error, proceed with response handling
                backgroundConnectionVerified = true;
                pingAttempts = 0;
                console.log('Periodic self-check (heartbeat) response:', response);
            });
        }
        catch (error) {
            console.log('Error sending heartbeat message, stopping periodic checks:', error instanceof Error ? error.message : String(error));
            // If we can't even send a message, the context is likely invalidated
            isContextInvalidated = true;
            if (periodicCheckIntervalId !== undefined) {
                clearInterval(periodicCheckIntervalId);
                periodicCheckIntervalId = undefined;
            }
            return;
        }
    }
    else if (!backgroundConnectionVerified && pingAttempts >= MAX_PING_ATTEMPTS) {
        console.log(`Background connection could not be verified after ${MAX_PING_ATTEMPTS} attempts. Stopping heartbeat checks.`);
        if (periodicCheckIntervalId !== undefined) {
            clearInterval(periodicCheckIntervalId);
            periodicCheckIntervalId = undefined;
        }
    }
}
// Run self-checks less frequently (every 30 seconds instead of 10) to reduce context invalidation chances
if (periodicCheckIntervalId === undefined) { // Ensure it's not set multiple times if script re-runs somehow
    periodicCheckIntervalId = window.setInterval(periodicSelfCheck, 30000); // Changed from 10000 to 30000
    // Store the interval ID globally so other instances can clean it up
    window[CONTENT_SCRIPT_ID + '_intervalId'] = periodicCheckIntervalId;
}
/**
 * Handles the RUN_CODE message by clicking the run button in the Earth Engine editor
 */
async function handleRunCode(code, sendResponse) {
    try {
        console.log('Handling RUN_CODE message, clicking run button');
        // Find the run button by its class and title attributes
        // GEE editor has a button with class "goog-button run-button" and title "Run script (Ctrl+Enter)"
        const runButton = document.querySelector('button.goog-button.run-button[title="Run script (Ctrl+Enter)"]');
        if (!runButton) {
            // Fallback to alternative selectors if the specific one fails
            const fallbackButton = document.querySelector('.run-button') ||
                document.querySelector('button[title*="Run script"]') ||
                document.querySelector('button.goog-button[value="Run"]');
            if (!fallbackButton) {
                console.error('Run button not found');
                sendResponse({
                    success: false,
                    error: 'Run button not found in the Google Earth Engine editor'
                });
                return;
            }
            console.log('Using fallback run button selector');
            fallbackButton.click();
        }
        else {
            // Click the run button
            runButton.click();
        }
        // Wait for a short time to allow the button state to change
        setTimeout(() => {
            // We successfully clicked the button
            sendResponse({
                success: true,
                result: 'Run button clicked successfully'
            });
        }, 500);
    }
    catch (error) {
        console.error('Error executing Earth Engine code:', error);
        sendResponse({
            success: false,
            error: `Error executing Earth Engine code: ${error instanceof Error ? error.message : String(error)}`
        });
    }
}
/**
 * Handles checking the Earth Engine console for errors
 */
function handleCheckConsole(sendResponse) {
    try {
        // Find console output element
        const consoleOutput = document.querySelector('.console-output');
        if (!consoleOutput) {
            sendResponse({
                success: true,
                errors: []
            });
            return;
        }
        // Get error elements from the console
        const errorElements = consoleOutput.querySelectorAll('.error, .warning');
        const errors = Array.from(errorElements).map(el => ({
            type: el.classList.contains('error') ? 'error' : 'warning',
            message: el.textContent || 'Unknown error'
        }));
        sendResponse({
            success: true,
            errors
        });
    }
    catch (error) {
        sendResponse({
            success: false,
            error: `Error checking console: ${error instanceof Error ? error.message : String(error)}`
        });
    }
}
/**
 * Handles inspecting the map at specific coordinates
 */
function handleInspectMap(coordinates, sendResponse) {
    try {
        if (!coordinates) {
            sendResponse({
                success: false,
                error: 'No coordinates provided'
            });
            return;
        }
        // This is a placeholder - actual implementation would need to interact with Earth Engine map
        // and might require injecting code to use the Map.onClick() or similar Earth Engine API
        sendResponse({
            success: true,
            data: {
                location: coordinates,
                message: 'Map inspection not fully implemented yet. This is a placeholder response.'
            }
        });
    }
    catch (error) {
        sendResponse({
            success: false,
            error: `Error inspecting map: ${error instanceof Error ? error.message : String(error)}`
        });
    }
}
/**
 * Handles getting Earth Engine tasks
 */
function handleGetTasks(sendResponse) {
    try {
        // This is a placeholder - actual implementation would need to access the Earth Engine 
        // task list from the UI or by executing code in the Earth Engine context
        sendResponse({
            success: true,
            tasks: [],
            message: 'Task retrieval not fully implemented yet. This is a placeholder response.'
        });
    }
    catch (error) {
        sendResponse({
            success: false,
            error: `Error getting tasks: ${error instanceof Error ? error.message : String(error)}`
        });
    }
}
// Notify the background script that the content script is loaded
function notifyBackgroundScriptLoaded() {
    // Check if extension context is valid before attempting communication
    try {
        if (typeof chrome === 'undefined' ||
            typeof chrome.runtime === 'undefined' ||
            typeof chrome.runtime.id === 'undefined') {
            console.warn('Extension context invalidated, cannot notify background script in notifyBackgroundScriptLoaded');
            isContextInvalidated = true;
            return;
        }
    }
    catch (error) {
        console.warn('Error checking extension context in notifyBackgroundScriptLoaded:', error);
        isContextInvalidated = true;
        return;
    }
    if (isContextInvalidated) {
        console.log('Context already marked as invalidated, skipping background script notification');
        return;
    }
    try {
        console.log('Earth Engine Agent content script loaded, notifying background script...');
        chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_LOADED' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Error notifying background script:', chrome.runtime.lastError);
                // Check for context invalidation
                if (chrome.runtime.lastError.message?.includes("Extension context invalidated")) {
                    console.error('Extension context invalidated during background script notification');
                    isContextInvalidated = true;
                    return;
                }
                // Retry with exponential backoff if we haven't exceeded max retries
                if (connectionRetries < MAX_CONNECTION_RETRIES) {
                    const delay = CONNECTION_RETRY_DELAYS[connectionRetries] || 10000; // Default to 10s for any retry beyond our array
                    connectionRetries++;
                    console.log(`Retrying connection to background script in ${delay}ms (attempt ${connectionRetries}/${MAX_CONNECTION_RETRIES})...`);
                    setTimeout(notifyBackgroundScriptLoaded, delay);
                }
                else {
                    console.error(`Failed to connect to background script after ${MAX_CONNECTION_RETRIES} attempts`);
                }
                return;
            }
            backgroundConnected = true;
            console.log('Background script notified of content script load.');
        });
    }
    catch (error) {
        console.error('Failed to notify background script:', error);
        isContextInvalidated = true;
    }
}
// Initialize content script
function initialize() {
    notifyBackgroundScriptLoaded();
}
/**
 * Handles editing an Earth Engine script
 */
async function handleEditScript(message, sendResponse) {
    console.log('Handling edit script message:', message);
    const scriptId = message.scriptId;
    const content = message.content || '';
    if (!scriptId || !content) {
        sendResponse({
            success: false,
            error: 'Script ID and content are required'
        });
        return;
    }
    try {
        // Create a log to track which method succeeded
        let successMethod = '';
        let editorUpdated = false;
        console.log('Attempting to update Earth Engine editor content...');
        // METHOD 1: Direct Ace editor access - try multiple paths
        try {
            console.log('METHOD 1: Attempting direct Ace editor access...');
            // Try different potential paths to find the Ace editor instance
            const editorPaths = [
                // Try standard AceEditor global
                () => window.ace,
                // Try to find the editor in the page scope
                () => Array.from(document.querySelectorAll('.ace_editor')).map(el => el.__ace_editor__ || el.env?.editor).find(editor => editor),
                // Try from CodeMirror if it's used instead
                () => {
                    const cmElements = document.querySelectorAll('.CodeMirror');
                    if (cmElements.length > 0) {
                        return Array.from(cmElements).map(el => el.CodeMirror).find(cm => cm);
                    }
                    return null;
                },
                // Try to find editor in Google Earth Engine specific objects
                () => window.ee?.Editor?.ace,
                () => window.ee?.data?.aceEditor,
                () => window.code?.editor?.aceEditor,
                // Last resort - try to scan the entire window object for anything that looks like an editor
                () => {
                    const foundEditors = [];
                    for (const key in window) {
                        try {
                            const obj = window[key];
                            if (obj && typeof obj === 'object' &&
                                (obj.setContent || obj.setValue || obj.getSession || obj.edit)) {
                                foundEditors.push(obj);
                            }
                        }
                        catch (e) {
                            // Ignore errors from security restrictions
                        }
                    }
                    return foundEditors[0]; // Return the first one we find
                }
            ];
            // Try each path until we find an editor
            let editor = null;
            for (const getEditor of editorPaths) {
                try {
                    const potentialEditor = getEditor();
                    if (potentialEditor) {
                        editor = potentialEditor;
                        console.log('Found potential editor:', editor);
                        break;
                    }
                }
                catch (e) {
                    // Continue to the next method
                    console.log('Editor path attempt failed:', e);
                }
            }
            if (editor) {
                // Try different methods to update content based on what API the editor exposes
                const updateMethods = [
                    // Standard Ace editor API
                    () => {
                        if (editor.getSession && editor.setValue) {
                            editor.setValue(content, -1); // -1 to place cursor at start
                            return true;
                        }
                        return false;
                    },
                    // Some editors have a setContent method
                    () => {
                        if (editor.setContent) {
                            editor.setContent(content);
                            return true;
                        }
                        return false;
                    },
                    // CodeMirror API
                    () => {
                        if (editor.setValue) {
                            editor.setValue(content);
                            return true;
                        }
                        return false;
                    },
                    // Nested session access
                    () => {
                        if (editor.getSession && editor.getSession().setValue) {
                            editor.getSession().setValue(content);
                            return true;
                        }
                        return false;
                    }
                ];
                for (const update of updateMethods) {
                    try {
                        if (update()) {
                            editorUpdated = true;
                            successMethod = 'Direct editor API';
                            console.log('Successfully updated editor content via direct API');
                            break;
                        }
                    }
                    catch (e) {
                        // Try the next method
                        console.log('Editor update method failed:', e);
                    }
                }
            }
        }
        catch (error) {
            console.error('Error accessing Ace editor directly:', error);
        }
        // METHOD 2: DOM Manipulation - Bypass CSP restrictions
        if (!editorUpdated) {
            try {
                console.log('METHOD 2: Attempting DOM manipulation...');
                // Find the pre elements in the editor
                const editorPres = document.querySelectorAll('.ace_editor pre');
                if (editorPres.length > 0) {
                    console.log(`Found ${editorPres.length} pre elements in the editor`);
                    // Create a text node with our content
                    const textNode = document.createTextNode(content);
                    // Clear and update the first pre element (main content area)
                    const mainPre = editorPres[0];
                    mainPre.textContent = '';
                    mainPre.appendChild(textNode);
                    // Dispatch input and change events to trigger editor update
                    mainPre.dispatchEvent(new Event('input', { bubbles: true }));
                    mainPre.dispatchEvent(new Event('change', { bubbles: true }));
                    // Find the textarea that may be connected to the editor
                    const textareas = document.querySelectorAll('textarea');
                    for (const textarea of Array.from(textareas)) {
                        try {
                            textarea.value = content;
                            textarea.dispatchEvent(new Event('input', { bubbles: true }));
                            textarea.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                        catch (e) {
                            console.log('Error updating textarea:', e);
                        }
                    }
                    editorUpdated = true;
                    successMethod = 'DOM manipulation';
                    console.log('Successfully updated editor content via DOM manipulation');
                }
                else {
                    console.log('No pre elements found in the editor');
                }
            }
            catch (error) {
                console.error('Error using DOM manipulation to update editor:', error);
            }
        }
        // METHOD 3: Find and update the hidden textarea that Ace uses
        if (!editorUpdated) {
            try {
                console.log('METHOD 3: Searching for hidden textarea...');
                // Look for textareas that might be connected to the editor
                const textareas = document.querySelectorAll('textarea');
                console.log(`Found ${textareas.length} textareas in the document`);
                let textareaUpdated = false;
                for (const textarea of Array.from(textareas)) {
                    try {
                        // Check if this might be an editor textarea (hidden ones are often used by Ace)
                        if (textarea.classList.contains('ace_text-input') ||
                            textarea.style.position === 'absolute' ||
                            textarea.style.opacity === '0' ||
                            textarea.style.height === '1px' ||
                            textarea.parentElement?.classList.contains('ace_editor')) {
                            console.log('Found potential editor textarea:', textarea);
                            // Set the value
                            textarea.value = content;
                            // Trigger input events
                            textarea.dispatchEvent(new Event('input', { bubbles: true }));
                            textarea.dispatchEvent(new Event('change', { bubbles: true }));
                            // Try to trigger a keypress event with Ctrl+A and then paste content
                            textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }));
                            textarea.dispatchEvent(new ClipboardEvent('paste', {
                                bubbles: true,
                                clipboardData: new DataTransfer()
                            }));
                            textareaUpdated = true;
                            console.log('Updated textarea:', textarea);
                        }
                    }
                    catch (e) {
                        console.log('Error updating a textarea:', e);
                    }
                }
                if (textareaUpdated) {
                    editorUpdated = true;
                    successMethod = 'Hidden textarea';
                    console.log('Successfully updated editor content via hidden textarea');
                }
            }
            catch (error) {
                console.error('Error updating hidden textarea:', error);
            }
        }
        // If all methods failed, return error
        if (!editorUpdated) {
            console.error('All methods for updating editor content failed');
            sendResponse({
                success: false,
                error: 'Failed to update editor content. Could not access the Earth Engine Code Editor. Try manually updating the code.'
            });
            return;
        }
        // Return success if any method worked
        console.log(`Editor content updated successfully using method: ${successMethod}`);
        sendResponse({
            success: true,
            method: successMethod,
            message: `Editor content updated successfully using ${successMethod}`
        });
    }
    catch (error) {
        console.error('Error editing Earth Engine script:', error);
        sendResponse({
            success: false,
            error: `Error editing Earth Engine script: ${error instanceof Error ? error.message : String(error)}`
        });
    }
}
/**
 * Handles getting information about Earth Engine map layers
 */
async function handleGetMapLayers(sendResponse) {
    try {
        console.log('Handling GET_MAP_LAYERS message');
        // Look for the layers panel which typically contains layer information
        const layersPanel = document.querySelector('.layers-card');
        if (!layersPanel) {
            console.log('Layers panel not found');
            sendResponse({
                success: true,
                layers: []
            });
            return;
        }
        // Find all layer items in the panel
        const layerItems = layersPanel.querySelectorAll('.layer-card');
        const layers = [];
        layerItems.forEach((item, index) => {
            try {
                // Extract layer ID - usually in the item ID or data attributes
                const id = item.id || `layer-${index}`;
                // Try to find the layer name
                const nameElement = item.querySelector('.layer-title, .layer-name');
                const name = nameElement ? nameElement.textContent?.trim() || `Layer ${index + 1}` : `Layer ${index + 1}`;
                // Check visibility - usually there's an eye icon or visibility checkbox
                const visibilityEl = item.querySelector('.visibility-toggle, input[type="checkbox"]');
                const visibleAttr = visibilityEl?.getAttribute('aria-checked') || visibilityEl?.getAttribute('checked');
                const hiddenClass = item.classList.contains('hidden') || item.classList.contains('layer-hidden');
                const visible = visibleAttr === 'true' || visibleAttr === 'checked' || !hiddenClass;
                // Try to find opacity information - often a slider or numeric value
                const opacityEl = item.querySelector('.opacity-slider, input[type="range"], .opacity-value');
                let opacity = 1.0; // Default to full opacity
                if (opacityEl) {
                    const opacityValue = opacityEl.getAttribute('value') ||
                        opacityEl.getAttribute('aria-valuenow') ||
                        opacityEl.value;
                    if (opacityValue) {
                        // Normalize to 0-1 range (Earth Engine sometimes uses 0-100)
                        opacity = parseFloat(opacityValue);
                        if (opacity > 1)
                            opacity /= 100;
                    }
                }
                // Look for layer type information if available
                const typeEl = item.querySelector('.layer-type');
                const type = typeEl ? typeEl.textContent?.trim() : undefined;
                // Add to layers collection
                layers.push({
                    id,
                    name,
                    visible,
                    opacity,
                    type,
                    zIndex: index
                });
            }
            catch (itemError) {
                console.warn(`Error parsing layer item:`, itemError);
                // Continue with other layers even if one fails
            }
        });
        console.log(`Found ${layers.length} map layers`);
        sendResponse({
            success: true,
            layers
        });
    }
    catch (error) {
        console.error('Error getting map layers:', error);
        sendResponse({
            success: false,
            error: `Error getting map layers: ${error instanceof Error ? error.message : String(error)}`
        });
    }
}
/**
 * Recursively searches for an element with a given aria-ref ID,
 * traversing through open shadow DOMs.
 */
function findElementInNodeRecursive(node, refId) {
    const selector = `[aria-ref="${refId}"]`;
    let foundElement = node.querySelector(selector);
    if (foundElement) {
        return foundElement;
    }
    // If not found in the current node, search in shadow roots of its children
    const elements = node.querySelectorAll('*');
    for (const element of Array.from(elements)) {
        if (element.shadowRoot && element.shadowRoot.mode === 'open') {
            foundElement = findElementInNodeRecursive(element.shadowRoot, refId);
            if (foundElement) {
                return foundElement;
            }
        }
    }
    return null;
}
/**
 * Handles getting element information by its aria-ref ID
 */
function handleGetElementByRefId(refId, sendResponse) {
    try {
        if (!refId) {
            sendResponse({
                success: false,
                error: 'refId is required'
            });
            return;
        }
        const element = findElementInNodeRecursive(document, refId);
        if (!element) {
            sendResponse({
                success: false,
                error: `No element found with refId: ${refId}`
            });
            return;
        }
        // Logic to extract element details (similar to getElement.ts content script part)
        const attributesObj = {};
        for (const attr of Array.from(element.attributes)) {
            attributesObj[attr.name] = attr.value;
        }
        const style = window.getComputedStyle(element);
        const isVisible = style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0';
        let isEnabled = true;
        if (element instanceof HTMLButtonElement ||
            element instanceof HTMLInputElement ||
            element instanceof HTMLSelectElement ||
            element instanceof HTMLTextAreaElement ||
            element instanceof HTMLOptionElement) {
            isEnabled = !element.disabled;
        }
        const rect = element.getBoundingClientRect();
        const boundingRect = {
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            left: rect.left,
            width: rect.width,
            height: rect.height
        };
        let value = undefined;
        if (element instanceof HTMLInputElement ||
            element instanceof HTMLTextAreaElement ||
            element instanceof HTMLSelectElement) {
            value = element.value;
        }
        const elementInfo = {
            tagName: element.tagName.toLowerCase(),
            id: element.id || undefined,
            className: element.className || undefined,
            textContent: element.textContent ? element.textContent.trim() : undefined,
            value,
            attributes: attributesObj,
            isVisible,
            isEnabled,
            boundingRect
        };
        sendResponse({
            success: true,
            elements: [elementInfo], // Return as an array for consistency with getElement
            count: 1
        });
    }
    catch (error) {
        console.error(`Error in handleGetElementByRefId for refId '${refId}':`, error);
        sendResponse({
            success: false,
            error: `Error getting element by refId: ${error instanceof Error ? error.message : String(error)}`
        });
    }
}
/**
 * Handles executing a click at specific coordinates on the page.
 */
async function handleExecuteClickByCoordinates(x, y, sendResponse) {
    try {
        console.log(`[Content Script] Attempting to click at coordinates: (${x}, ${y})`);
        const elementAtPoint = document.elementFromPoint(x, y);
        if (!elementAtPoint) {
            sendResponse({
                success: false,
                error: `No element found at coordinates (${x}, ${y})`
            });
            return;
        }
        console.log(`[Content Script] Element at (${x},${y}):`, elementAtPoint);
        // Create and dispatch mouse events to simulate a click
        // Standard sequence: pointerdown, mousedown, pointerup, mouseup, click
        const eventSequence = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
        for (const eventType of eventSequence) {
            const event = new MouseEvent(eventType, {
                bubbles: true,
                cancelable: true,
                clientX: x,
                clientY: y,
                view: window,
                composed: true // Important for events to cross shadow DOM boundaries if needed
            });
            console.log(`[Content Script] Dispatching ${eventType} on`, elementAtPoint);
            elementAtPoint.dispatchEvent(event);
        }
        sendResponse({
            success: true,
            message: `Successfully simulated click at (${x}, ${y}) on element: ${elementAtPoint.tagName}`
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[Content Script] Error executing click by coordinates:', errorMessage);
        sendResponse({
            success: false,
            error: `Error clicking by coordinates in page: ${errorMessage}`
        });
    }
}
async function handleClickByRefId(refId, sendResponse) {
    console.log(`Content script: Handling CLICK_BY_REF_ID for refId: ${refId}`);
    try {
        if (typeof chrome === 'undefined' || typeof chrome.runtime === 'undefined' || typeof chrome.runtime.id === 'undefined') {
            console.warn('[ClickByRefIdTool - CS] Extension context appears to be invalidated. Aborting.');
            sendResponse({ success: false, error: 'Extension context invalidated' });
            return;
        }
        const element = findElementInNodeRecursive(document, refId);
        if (element && typeof element.click === 'function') {
            element.click();
            console.log(`Successfully clicked element with refId: ${refId}`);
            sendResponse({ success: true, message: `Successfully clicked element with refId: ${refId}`, refId });
        }
        else {
            console.warn(`Element with refId '${refId}' not found or not clickable.`);
            sendResponse({ success: false, error: `Element with refId '${refId}' not found or not clickable.`, refId });
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error clicking element with refId '${refId}':`, error);
        sendResponse({ success: false, error: `Error clicking element: ${errorMessage}`, refId });
    }
}
async function handleTakeAccessibilitySnapshot(sendResponse) {
    console.log('Content script: Handling TAKE_ACCESSIBILITY_SNAPSHOT');
    try {
        const result = await (0,_lib_tools_browser_snapshot__WEBPACK_IMPORTED_MODULE_0__.snapshot)(); // This will call captureDirectSnapshot
        sendResponse(result);
    }
    catch (error) {
        console.error('Error taking accessibility snapshot in content script:', error);
        sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error in handleTakeAccessibilitySnapshot'
        });
    }
}
console.log('Earth Engine AI Assistant content script fully loaded and listeners attached.');
// Add a global error handler to catch any remaining uncaught errors
window.addEventListener('error', (event) => {
    if (event.error && event.error.message && event.error.message.includes('Extension context invalidated')) {
        console.warn('Global error handler caught extension context invalidation, marking context as invalid');
        isContextInvalidated = true;
        // Clear the periodic check if it's still running
        if (periodicCheckIntervalId !== undefined) {
            clearInterval(periodicCheckIntervalId);
            periodicCheckIntervalId = undefined;
        }
        // Prevent the error from bubbling up
        event.preventDefault();
        return false;
    }
});
// Add unhandled promise rejection handler for extension context errors
window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.message && event.reason.message.includes('Extension context invalidated')) {
        console.warn('Global promise rejection handler caught extension context invalidation');
        isContextInvalidated = true;
        // Clear the periodic check if it's still running
        if (periodicCheckIntervalId !== undefined) {
            clearInterval(periodicCheckIntervalId);
            periodicCheckIntervalId = undefined;
        }
        // Prevent the error from causing console spam
        event.preventDefault();
    }
});
// Clean up when the page is about to unload
window.addEventListener('beforeunload', () => {
    console.log('Content script cleaning up before page unload...');
    // Clear the periodic check interval
    if (periodicCheckIntervalId !== undefined) {
        clearInterval(periodicCheckIntervalId);
        periodicCheckIntervalId = undefined;
    }
    // Remove our singleton marker
    delete window[CONTENT_SCRIPT_ID];
    delete window[CONTENT_SCRIPT_ID + '_intervalId'];
    // Mark context as invalidated to prevent any further operations
    isContextInvalidated = true;
});

})();

/******/ })()
;
//# sourceMappingURL=content.js.map