#!/usr/bin/env node

const untildify = require('untildify');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const BEAR_DB = untildify(
  '~/Library/Group Containers/9K33E3U3T4.net.shinyfrog.bear/Application Data/database.sqlite'
);
const BEAR_IMAGES = untildify(
  '~/Library/Group Containers/9K33E3U3T4.net.shinyfrog.bear/Application Data/Local Files/Note Images/'
);

const [,, outputDirectory] = process.argv;
if (!outputDirectory) {
  process.stderr.write('You must provide an output directory\n');
  process.exit(1);
}

function bearDateToISO(bearDate) {
  if (!bearDate) return '';
  const macEpoch = new Date('2001-01-01T00:00:00Z').getTime();
  const ms = macEpoch + (parseFloat(bearDate) * 1000);
  return new Date(ms).toISOString();
}

function md5FileSync(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(data).digest('hex');
}

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

main(untildify(outputDirectory))
  .then(count => {
    console.log(`Exported ${count} notes to Day One JSON.`);
  })
  .catch(err => {
    process.nextTick(() => {
      throw err;
    });
  });

async function main(outputDirectory) {
  ensureDirSync(outputDirectory);
  const photosDir = path.join(outputDirectory, 'photos');
  ensureDirSync(photosDir);
  const db = new Database(BEAR_DB, { readonly: true });

  // Map Z_PK to ZUNIQUEIDENTIFIER for notes
  const noteIdToUUID = {};
  db.prepare('SELECT Z_PK, ZUNIQUEIDENTIFIER FROM ZSFNOTE').all().forEach(row => {
    noteIdToUUID[row.Z_PK] = row.ZUNIQUEIDENTIFIER;
  });

  // Get all image files
  const imageFiles = db.prepare('SELECT Z_PK, ZNOTE, ZFILENAME, ZUNIQUEIDENTIFIER FROM ZSFNOTEFILE').all();
  // Map: note PK -> [{filename, uuid}]
  const noteImages = {};
  imageFiles.forEach(img => {
    if (!noteImages[img.ZNOTE]) noteImages[img.ZNOTE] = [];
    noteImages[img.ZNOTE].push({ filename: img.ZFILENAME, uuid: img.ZUNIQUEIDENTIFIER });
  });

  // Get all notes
  const notes = db.prepare(`
    SELECT Z_PK, ZTITLE, ZTEXT, ZUNIQUEIDENTIFIER, ZCREATIONDATE, ZMODIFICATIONDATE, ZPINNED
    FROM ZSFNOTE
    WHERE ZTRASHED = 0
  `).all();

  const entries = [];
  for (const note of notes) {
    let text = note.ZTEXT || '';
    const images = (noteImages[note.Z_PK] || []);
    const photos = [];
    // Replace Bear image markdown with Day One style and collect photo info
    for (const img of images) {
      const imgDir = path.join(BEAR_IMAGES, img.uuid);
      if (!fs.existsSync(imgDir)) continue;
      const files = fs.readdirSync(imgDir).filter(f => !f.startsWith('.'));
      if (files.length === 0) continue;
      const file = files[0];
      const ext = path.extname(file).replace('.', '').toLowerCase();
      const filePath = path.join(imgDir, file);
      const md5 = md5FileSync(filePath);
      const destFile = path.join(photosDir, md5 + '.' + ext);
      if (!fs.existsSync(destFile)) {
        fs.copyFileSync(filePath, destFile);
      }
      // Add photo object
      photos.push({
        identifier: img.uuid,
        md5,
        type: ext
      });
      // Replace Bear markdown with Day One reference
      // Replace all possible markdowns for this image
      const bearMdRegex = new RegExp(`!\\[\\]\\((?:${img.filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\)`, 'g');
      text = text.replace(bearMdRegex, `![](dayone-moment://${img.uuid})`);
    }
    // Remove any leftover Bear image markdown
    text = text.replace(/!\[\]\([^\)]+\.(png|jpg|jpeg|gif|heic|webp)\)/gi, '').replace(/\n{3,}/g, '\n\n').trim();
    entries.push({
      text,
      creationDate: bearDateToISO(note.ZCREATIONDATE),
      modifiedDate: bearDateToISO(note.ZMODIFICATIONDATE),
      uuid: note.ZUNIQUEIDENTIFIER,
      starred: false,
      isPinned: !!note.ZPINNED,
      editingTime: 0,
      photos
    });
  }

  const journal = {
    metadata: { version: '1.0' },
    entries
  };
  fs.writeFileSync(path.join(outputDirectory, 'Journal.json'), JSON.stringify(journal, null, 2), 'utf8');
  return entries.length;
} 