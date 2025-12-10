
import * as fs from 'fs';
import * as path from 'path';

const SUPPLY = 100;
const SOURCE_DIR = path.join(process.cwd(), 'source_assets');
const TARGET_DIR = path.join(process.cwd(), 'assets');

if (fs.existsSync(TARGET_DIR)) {
    fs.rmSync(TARGET_DIR, { recursive: true, force: true });
}
fs.mkdirSync(TARGET_DIR);

// Copy collection assets
fs.copyFileSync(path.join(SOURCE_DIR, 'collection.png'), path.join(TARGET_DIR, 'collection.png'));
fs.copyFileSync(path.join(SOURCE_DIR, 'collection.json'), path.join(TARGET_DIR, 'collection.json'));

const sources = [0, 1, 2];

for (let i = 0; i < SUPPLY; i++) {
    const randomSource = sources[Math.floor(Math.random() * sources.length)];
    
    // Copy Image
    fs.copyFileSync(
        path.join(SOURCE_DIR, `${randomSource}.png`),
        path.join(TARGET_DIR, `${i}.png`)
    );

    // Create JSON
    const sourceJson = JSON.parse(fs.readFileSync(path.join(SOURCE_DIR, `${randomSource}.json`), 'utf-8'));
    
    const newJson = {
        name: `SnapDrop #${i + 1}`,
        symbol: "DEV",
        description: "SnapDrop Random Drop",
        image: `${i}.png`,
        properties: {
            files: [{ uri: `${i}.png`, type: "image/png" }]
        }
    };

    fs.writeFileSync(path.join(TARGET_DIR, `${i}.json`), JSON.stringify(newJson, null, 4));
}

console.log(`Generated ${SUPPLY} assets in ${TARGET_DIR}`);
