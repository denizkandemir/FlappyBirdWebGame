
// saves/saveAdapter.js
// Patch localStorage so all game saves are per-profile and stored in OPFS ("saves/<profile>.json").
// Fallback to IndexedDB if OPFS is unavailable. Final fallback: namespaced localStorage.

(function(){
  const STORAGE_KEYSET = new Set([
    'angryflappy_high',
    'angryflappy_bestscore',
    'angryflappy_bestcaprun',
    'angryflappy_balls',
    'angryflappy_collection',
    // add any other keys you want isolated per profil here:
    // 'angryflappy_collection', 'angryflappy_settings', ...
  ]);

  function debounced(fn, ms=200){
    let t=null; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), ms); };
  }

  // --- Utils ---
  const asciiFoldMap = {'à':'a','á':'a','â':'a','ä':'a','ã':'a','å':'a','æ':'ae','ç':'c','è':'e','é':'e','ê':'e','ë':'e','ì':'i','í':'i','î':'i','ï':'i','ñ':'n','ò':'o','ó':'o','ô':'o','ö':'o','õ':'o','œ':'oe','ù':'u','ú':'u','û':'u','ü':'u','ý':'y','ÿ':'y'};
  function sanitizeName(s){
    return (s||'').toLowerCase().replace(/[^\u0000-\u007E]/g, c=>asciiFoldMap[c]||'')
      .replace(/[^a-z0-9 _-]+/g,'').replace(/\s+/g,'_').replace(/_+/g,'_').replace(/^_+|_+$/g,'');
  }

  // --- Save backends ---
  class OPFSBackend{
    constructor(){ this.rootDir = null; this.savesDir = null; }
    async init(){
      this.rootDir = await navigator.storage.getDirectory();
      this.savesDir = await this.rootDir.getDirectoryHandle('saves', { create: true });
    }
    async read(profileId){
      const fname = `${profileId}.json`;
      try{
        const fh = await this.savesDir.getFileHandle(fname, { create: true });
        const file = await fh.getFile();
        const text = await file.text();
        return text ? JSON.parse(text) : {};
      }catch(e){ return {}; }
    }
    async write(profileId, data){
      const fname = `${profileId}.json`;
      const fh = await this.savesDir.getFileHandle(fname, { create: true });
      const w = await fh.createWritable();
      await w.write(new Blob([JSON.stringify(data, null, 2)], {type:'application/json'}));
      await w.close();
    }
  }

  class IDBBackend{
    constructor(){ this.dbp = null; }
    async init(){
      this.dbp = await new Promise((resolve, reject)=>{
        const req = indexedDB.open('AF_SaveDB', 1);
        req.onupgradeneeded = e => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('profiles')) db.createObjectStore('profiles');
        };
        req.onsuccess = e => resolve(e.target.result);
        req.onerror = e => reject(e.target.error);
      });
    }
    async read(profileId){
      const db = this.dbp;
      return await new Promise((resolve, reject)=>{
        const tx = db.transaction('profiles','readonly');
        const st = tx.objectStore('profiles');
        const req = st.get(profileId);
        req.onsuccess = ()=> resolve(req.result || {});
        req.onerror = ()=> resolve({});
      });
    }
    async write(profileId, data){
      const db = this.dbp;
      return await new Promise((resolve, reject)=>{
        const tx = db.transaction('profiles','readwrite');
        const st = tx.objectStore('profiles');
        const req = st.put(data, profileId);
        req.onsuccess = ()=> resolve();
        req.onerror = ()=> reject(req.error);
      });
    }
  }

  class NamespacedLocalStorageBackend{
    constructor(){ this.ns = 'AF_profile:'; }
    async init(){}
    async read(profileId){
      try{ return JSON.parse(window.__REAL_LOCALSTORAGE__.getItem(this.ns+profileId)||'{}'); }
      catch(e){ return {}; }
    }
    async write(profileId, data){
      window.__REAL_LOCALSTORAGE__.setItem(this.ns+profileId, JSON.stringify(data));
    }
  }

  // --- SaveManager ---
  class SaveManager{
    constructor(){
      this.backend = null;
      this.profile = null; // {id, fullName, firstName, lastName}
      this.cache = {};   // { key: stringValue }
      this.ready = false;
      this.flush = debounced(()=>this._flush(), 150);
    }
    async init(){
      window.__REAL_LOCALSTORAGE__ = window.localStorage; // keep reference
      // Choose backend
      if (navigator.storage && navigator.storage.getDirectory){
        this.backend = new OPFSBackend();
      } else if (window.indexedDB){
        this.backend = new IDBBackend();
      } else {
        this.backend = new NamespacedLocalStorageBackend();
      }
      try{ await this.backend.init(); }catch(e){ this.backend = new NamespacedLocalStorageBackend(); }
      // Patch Storage methods so all localStorage reads/writes go through us
      this._patchStorage();
    }
    _patchStorage(){
      const StorageProto = Storage.prototype;
      const realGet = StorageProto.getItem;
      const realSet = StorageProto.setItem;
      const realRemove = StorageProto.removeItem;
      const realClear = StorageProto.clear;

      const self = this;
      StorageProto.getItem = function(key){
        if (this === window.localStorage && self.profile){
          key = String(key);
          if (!STORAGE_KEYSET.size || STORAGE_KEYSET.has(key)){
            return Object.prototype.hasOwnProperty.call(self.cache, key) ? self.cache[key] : null;
          }
        }
        return realGet.apply(this, arguments);
      };
      StorageProto.setItem = function(key, val){
        if (this === window.localStorage && self.profile){
          key = String(key); val = String(val);
          if (!STORAGE_KEYSET.size || STORAGE_KEYSET.has(key)){
            self.cache[key] = val;
            self.flush();
            return;
          }
        }
        return realSet.apply(this, arguments);
      };
      StorageProto.removeItem = function(key){
        if (this === window.localStorage && self.profile){
          key = String(key);
          if (!STORAGE_KEYSET.size || STORAGE_KEYSET.has(key)){
            delete self.cache[key]; self.flush(); return;
          }
        }
        return realRemove.apply(this, arguments);
      };
      StorageProto.clear = function(){
        if (this === window.localStorage && self.profile){
          for (const k of Object.keys(self.cache)){ delete self.cache[k]; }
          self.flush(); return;
        }
        return realClear.apply(this, arguments);
      };
    }
    async useProfile({firstName, lastName, fullName}){
      const id = sanitizeName(`${firstName} ${lastName}`.trim());
      this.profile = { id, firstName, lastName, fullName: fullName || `${firstName} ${lastName}`.trim() };
      const data = await this.backend.read(this.profile.id);
      this.cache = { ...data };
      this.ready = true;
      window.dispatchEvent(new CustomEvent('af:save:ready', { detail: { profile: this.profile }}));
      return this.profile;
    }
    async _flush(){
      if (!this.profile) return;
      const out = { ...this.cache, profile: this.profile, __updatedAt__: Date.now(), __version__: 1 };
      try{ await this.backend.write(this.profile.id, out); }
      catch(e){ console.error('Save flush error', e); }
    }
  }

  const manager = new SaveManager();
  manager.init();
  window.AF_SaveManager = manager;
  window.AF_sanitizeProfileName = sanitizeName;
})();
