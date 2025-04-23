const sharp = require('sharp');
const path = require('path');

const sizes = [16, 32, 48, 128];
const inputFile = path.join(__dirname, '../src/assets/icon.svg');

async function generateIcons() {
    for (const size of sizes) {
        const outputFile = path.join(__dirname, `../src/assets/icon${size}.png`);
        await sharp(inputFile)
            .resize(size, size)
            .png()
            .toFile(outputFile);
        console.log(`Generated ${size}x${size} icon`);
    }
}

generateIcons().catch(console.error); 