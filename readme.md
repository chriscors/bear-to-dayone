# Bear2DayOne Exporter

This tool helps you export your Bear notes—including images—into a Day One-compatible JSON format for easy import into Day One, including a photos folder with all your note images.

## Features
- Export all Bear notes to a single `Journal.json` file in Day One's import format
- Extract and include all images, placing them in a `photos/` subfolder, named by their md5 hash (as Day One expects)
- Converts Bear's date format to ISO 8601
- Rewrites Bear image markdown to Day One's image reference format
- CLI output directory argument for easy, organized export

## Usage

1. **Install dependencies:**
   ```sh
   npm install
   ```

2. **Run the export script:**
   ```sh
   node export-bear-to-dayone.js /path/to/output-dir
   ```
   - This will create `/path/to/output-dir/Journal.json` and `/path/to/output-dir/photos/` with all images.

3. **Import into Day One:**
   - In Day One, use the "Import" feature and select the `Journal.json` file. Make sure the `photos` folder is in the same directory.

## Notes
- Only non-trashed notes are exported.
- Images are extracted from Bear's internal storage and matched to notes.
- The `starred` field is always set to `false` (Bear does not expose this in the current schema).
- The script is designed for macOS Bear installations.

## Thanks

This project is based on and inspired by the original [backup-bear-notes](https://github.com/TehShrike/backup-bear-notes) by [TehShrike](https://github.com/TehShrike). Huge thanks to the original author for their contributions to the Bear community and for making Bear data more accessible!

---

License: [WTFPL](https://wtfpl2.com)
