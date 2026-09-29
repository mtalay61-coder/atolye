const ts=require('typescript');const fs=require('fs');
const src=fs.readFileSync(process.argv[2],'utf8');
const sf=ts.createSourceFile('a.tsx',src,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const L=(p)=>sf.getLineAndCharacterOfPosition(p).line+1;
const tgt=+process.argv[3];
function walk(n){ if((ts.isJsxElement(n)||ts.isJsxFragment(n))&&L(n.getStart())===tgt){ n.children.forEach(c=>{ if(c.kind===ts.SyntaxKind.JsxText&&!c.getText().trim())return; console.log(L(c.getStart())+'-'+L(c.getEnd()), ts.SyntaxKind[c.kind], c.getText().slice(0,100).replace(/\n/g,' ')); }); return;} ts.forEachChild(n,walk);}
walk(sf);
