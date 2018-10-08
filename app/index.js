require('console-ultimate/global').replace();

const fs = require('fs');
const exec = require('child_process').exec;
const sqlite3 = require('sqlite3').verbose();
const find = require('find');
const path = require('path');
const md5 = require('md5-file');

const VERSION = 'v2';

const __src = process.env.SRC_DIR || '/src';
const __dst = process.env.DST_DIR || '/dst';

if (__src == null || __dst == null) {
   throw new Error('__src or __dst null');
}

let db;

function getExtension(filename) {
   return filename.split('.').slice(0, -1).join('.');
}

async function execPromise(command) {
   return new Promise((resolve, reject) => {
      exec(command, {}, (err, stdout, stderr) => {
         if (err) return reject(stderr);
         return resolve(stdout);
      });
   });
}

function getFileHash(file) {
   const filepath = path.join(__src, file);
   return VERSION + '-' + md5.sync(filepath);
}

async function createDatabase() {
   return new Promise(resolve => {
      db = new sqlite3.Database(path.join(__src, 'assets.db'));
      db.run("CREATE TABLE IF NOT EXISTS files (file VARCHAR(255) PRIMARY KEY, hash VARCHAR(32))", () => {
         resolve();
      });
   });
}

async function hasBeenConvertedTo(file, format) {
   return new Promise((resolve, reject) => {
      const stmt = db.prepare(`SELECT ${format} FROM conversions WHERE file = ?`);
      stmt.get([file], (err, row) => {
         if (err) return reject(err);
         resolve(row[format]);
      });
   });
}

async function indexFile(file) {
   return new Promise((resolve, reject) => {
      const fetch_stmt = db.prepare('SELECT * FROM files WHERE file = ?');
      const hash = getFileHash(file);

      fetch_stmt.get([file], (err, row) => {
         if (err) return reject(err);
         if (row == null || row.hash !== hash) {
            return resolve(true);
         }

         return resolve(false);
      });
   });
}

async function markFileAsProcessed(file) {
   return new Promise(resolve => {
      const insert_stmt = db.prepare('INSERT OR REPLACE INTO files (file, hash) VALUES (?, ?)');
      const hash = getFileHash(file);
      insert_stmt.run([file, hash], resolve);
   });
}

async function markFilesAsProcessed(files) {
   return new Promise(async (resolve) => {
      for (let file of files) {
         await markFileAsProcessed(file);
      }
      resolve();
   });
}

async function indexFiles() {
   return new Promise(resolve => {
      let files_to_process = [];
      find.file(__src, async (files) => {
         for (let filepath of files) {
            const file = filepath.replace(__src, '');
            let should_process = await indexFile(file);
            if (should_process) {
               files_to_process.push(file);
            }
         }
         resolve(files_to_process);
      });
   });
}

async function copyFile(file) {
   console.log('Copying ' + file);

   const dir = path.dirname(file);
   const filepath = path.join(__src, file);
   const filename = path.basename(file);
   const dst_dir = path.join(__dst, dir);
   const dst_file = path.join(dst_dir, filename);

   // Create directory of file
   await execPromise(`/bin/mkdir -p "${dst_dir}"`);
   return execPromise(`/bin/cp -v "${filepath}" "${dst_file}"`);
}

async function copyFiles(files) {
   return new Promise(async (resolve) => {
      for (let file of files) {
         await copyFile(file);
      }
      resolve();
   });
}

async function processFiles(files) {
   return new Promise(async (resolve, reject) => {
      const processed_files = [];
      for (let file of files) {
         try {

            let did_work = true;

            const filepath = path.join(__dst, file);

            if (/\.(jpg|jpeg)$/i.test(filepath)) {
               await processImage(filepath);
               await processJPG(filepath);
               await convertToWEBP(filepath);

            } else if (/\.png$/i.test(filepath)) {
               await processImage(filepath);
               await processPNG(filepath);
               await convertToWEBP(filepath);

            } else if (/\.gif$/i.test(filepath)) {
               await processGIF(filepath);

            } else if (/\.(mov|avi)$/i.test(filepath)) {
               await convertToMP4(filepath);
               await convertToWEBM(filepath);
               await convertToOGG(filepath);

            } else if (/\.(mp4)$/i.test(filepath)) {
               await convertToOGG(filepath);
               await convertToWEBM(filepath);

            } else if (/\.(ogg)$/i.test(filepath)) {
               await convertToMP4(filepath);
               await convertToWEBM(filepath);

            } else {
               did_work = false;
            }

            if (did_work) {
               console.log(`Successfully processed: ${file}`);
            }

            processed_files.push(file);

         } catch (err) {
            console.error(`Error in processing ${file}: ${err}`);
         }
      }
      resolve(processed_files);
   });
}

async function processImage(filepath) {
   console.log(`Processing image <${filepath}>`);
   return execPromise(`convert "${filepath}" -strip -quality 80 "${filepath}"`);
}

async function processJPG(filepath) {
   console.log(`Optimizing JPEG <${filepath}>`);
   return execPromise(`jpegoptim "${filepath}"`);
}

async function processPNG(filepath) {
   console.log(`Optimizing PNG <${filepath}>`);
   return execPromise(`pngquant --ext .png --force "${filepath}"`);
}

async function processGIF(filepath) {
   console.log(`Optimizing GIF <${filepath}>`);
   return execPromise(`gifsicle -O2 "${filepath}" -o "${filepath}"`);
}

async function convertToWEBP(filepath) {
   const dst_path = filepath.replace(/\..+$/g, '.webp');
   const src_path = dst_path.replace(__dst, __src);
   if (fs.existsSync(src_path)) {
      throw new Error(`Unable to convert <${filepath}> because original <${src_path}> will be overwritten`);
   }

   console.log(`Converting to WEBP <${filepath}>`);
   return execPromise(`cwebp "${filepath}" -o "${dst_path}"`);
}

async function convertToMP4(filepath) {
   const dst_path = filepath.replace(/\..+$/g, '.mp4');
   const src_path = dst_path.replace(__dst, __src);
   if (fs.existsSync(src_path)) {
      throw new Error(`Unable to convert <${filepath}> because original <${src_path}> will be overwritten`);
   }

   console.log(`Converting to MP4 <${filepath}>`);
   return execPromise(`ffmpeg \
      -i "${filepath}" \
      -f mp4 \
      -vcodec libx264 \
      -preset fast \
      -profile:v main \
      -acodec aac \
      "${dst_path}" \
      -hide_banner`);
}

async function convertToOGG(filepath) {
   const dst_path = filepath.replace(/\..+$/g, '.ogg');
   const src_path = dst_path.replace(__dst, __src);
   if (fs.existsSync(src_path)) {
      throw new Error(`Unable to convert <${filepath}> because original <${src_path}> will be overwritten`);
   }

   console.log(`Converting to OGG <${filepath}>`);
   return execPromise(filepath, `ffmpeg \
   -i "${filepath}" \
   "${dst_path}" \
   -hide_banner`);
}

async function convertToWEBM(filepath) {
   const dst_path = filepath.replace(/\..+$/g, '.webm');
   const src_path = dst_path.replace(__dst, __src);
   if (fs.existsSync(src_path)) {
      throw new Error(`Unable to convert <${filepath}> because original <${src_path}> will be overwritten`);
   }

   console.log(`Converting to WEBM <${filepath}>`);
   return execPromise(`ffmpeg \
      -i "${filepath}" \
      "${dst_path}" \
      -hide_banner`);
}


(async function main() {

   await createDatabase();

   let files = await indexFiles();
   await copyFiles(files);

   let processed_files = await processFiles(files);
   await markFilesAsProcessed(processed_files);

   db.close();
   process.exit(0);

})();