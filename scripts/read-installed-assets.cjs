'use strict';
const fs=require('node:fs');
function readInstalledAssets(archive) {
  const fd=fs.openSync(archive,'r');
  const prefix=Buffer.alloc(16);
  fs.readSync(fd,prefix,0,16,0);
  const bytes=Buffer.alloc(prefix.readUInt32LE(12));
  fs.readSync(fd,bytes,0,bytes.length,16);
  const entries=JSON.parse(bytes).files.webview.files.assets.files;
  const base=8+prefix.readUInt32LE(4);
  return {
    names:Object.keys(entries),
    read(name) {
      const entry=entries[name];
      if(!entry||entry.unpacked)throw Error('Pinned compiled resource missing: '+name);
      const buffer=Buffer.alloc(entry.size);
      fs.readSync(fd,buffer,0,buffer.length,base+Number(entry.offset));
      return buffer.toString('utf8');
    },
    close() { fs.closeSync(fd); },
  };
}
module.exports={readInstalledAssets};
