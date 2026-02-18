const dxzAxios = require('axios');
const dxzCheerio = require('cheerio');
const dxzVm = require('vm');
const dxzFs = require('fs').promises;
const dxzPath = require('path');

async function dxzObf(dxzInput) {
  let dxzSrc = '';
  
  try {
    if (typeof dxzInput === 'string' && dxzInput.endsWith('.js')) {
      dxzSrc = await dxzFs.readFile(dxzInput, 'utf8');
      console.log(`[+] File loaded: ${dxzPath.resolve(dxzInput)} (${dxzSrc.length} chars)`);
    } else {
      dxzSrc = dxzInput;
    }

    const dxzBox = {
      window: {},
      document: {
        getElementById: function(id) {
          return { value: '', innerText: '', innerHTML: '' };
        }
      },
      ace: {
        edit: function(id) {
          return {
            getValue: function() { return dxzSrc; },
            setValue: function(val) { dxzBox.dxzResult = val; },
            getSession: function() { return { setMode: () => {} }; }
          };
        }
      },
      console: console,
      dxzResult: '',
      dxzCode: dxzSrc,
      Buffer: Buffer,
    };

    const dxzObfLogic = `
      function dxzProtect(code) {
        var res = code;
        var vcnt = 0;
        var fcnt = 0;
        var dxzMap = {};
        
        // functions
        res = res.replace(/function\\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, function(m, n) {
          if (!dxzMap[n]) {
            dxzMap[n] = '_0x' + (++fcnt).toString(16) + Math.random().toString(36).substr(2,4);
          }
          return 'function ' + dxzMap[n];
        });
       
        // variables
        res = res.replace(/\\b(var|let|const)\\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, function(m, kw, n) {
          if (!dxzMap[n]) {
            dxzMap[n] = '_0x' + (++vcnt).toString(16) + Math.random().toString(36).substr(2,4);
          }
          return kw + ' ' + dxzMap[n];
        });
        
        // rename everywhere
        for (var old in dxzMap) {
          var neu = dxzMap[old];
          var r = new RegExp('\\\\b' + old + '\\\\b', 'g');
          res = res.replace(r, neu);
        }
        
        // minify
        res = res.replace(/\\s+/g, ' ');
        res = res.replace(/\\s*([{}();,=+\\-*/<>!&|])\\s*/g, '$1');
        
        // string encoding
        var dxzStrs = [];
        res = res.replace(/'([^']*)'/g, function(m, s) {
          dxzStrs.push(s);
          return "'__STR_" + (dxzStrs.length - 1) + "__'";
        });
       
        res = res.replace(/"([^"]*)"/g, function(m, s) {
          dxzStrs.push(s);
          return '"__STR_' + (dxzStrs.length - 1) + '__"';
        });
        
        dxzStrs.forEach(function(s, i) {
          var enc = Buffer.from(s).toString('base64');
          res = res.replace('__STR_' + i + '__', '"' + enc + '"');
        });
        
        return res;
      }
      
      function btoa(s) {
        return Buffer.from(s).toString('base64');
      }
      
      dxzResult = dxzProtect(dxzCode);
    `;

    dxzVm.createContext(dxzBox);
    dxzVm.runInContext(dxzObfLogic, dxzBox);

    const dxzOut = {
      ok: true,
      src: "dxz-obf",
      inLen: dxzSrc.length,
      outLen: dxzBox.dxzResult.length,
      code: dxzBox.dxzResult
    };

    return dxzOut;

  } catch (e) {
    throw new Error(`dxz-obf failed: ${e.message}`);
  }
}

// CLI part
async function dxzRun() {
  const dxzArgs = process.argv.slice(2);
  
  if (dxzArgs.length === 0) {
    console.log('Usage: node dxz.js <input.js> [output.js]');
    console.log('  ex: node dxz.js app.js protected.js');
    process.exit(1);
  }

  try {
    const dxzInFile  = dxzArgs[0];
    const dxzOutFile = dxzArgs[1];
    
    const dxzResult = await dxzObf(dxzInFile);
    
    console.log('✓ Done');
    console.log(`  ${dxzResult.inLen} → ${dxzResult.outLen} chars`);
    console.log('Result:');
    console.log(dxzResult.code);
    
    if (dxzOutFile) {
      await dxzFs.writeFile(dxzOutFile, dxzResult.code);
      console.log(`→ Saved: ${dxzPath.resolve(dxzOutFile)}`);
    }
    
  } catch (e) {
    console.error('✗ Error:', e.message);
    process.exit(1);
  }
}

module.exports = {
  obfuscate: dxzObf,
  protect: dxzObf,
  dxzObfuscator: dxzObf
};

if (require.main === module) {
  dxzRun();
}
