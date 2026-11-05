'use strict';
const fs=require('node:fs');
// Read shipped assets as bytes. Never execute the installed application's entry.
exports.readAsarDirectory=function(archive,segments){
 const fd=fs.openSync(archive,'r'),prefix=Buffer.alloc(16);
 fs.readSync(fd,prefix,0,16,0);
 const bytes=Buffer.alloc(prefix.readUInt32LE(12));fs.readSync(fd,bytes,0,bytes.length,16);
 let entries=JSON.parse(bytes).files;for(const name of segments)entries=entries[name].files;
 const base=8+prefix.readUInt32LE(4);
 return{names:Object.keys(entries),has:name=>!!entries[name],read(name){const item=entries[name];if(!item||item.unpacked||item.files)throw Error('Missing shipped asset: '+name);const data=Buffer.alloc(item.size);fs.readSync(fd,data,0,data.length,base+Number(item.offset));return data},close(){fs.closeSync(fd)}};
};
