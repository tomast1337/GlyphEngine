import * as Bun from "bun";
import * as fs from "fs";

const outDir = "./out";

// find all .ts files in the programs directory
const files = new Bun.Glob("programs/**/*.ts");

const getemoInfo = async (path: string) => {
  const file = Bun.file(path);
  const content = await file.text();
  
  // Extract author, title, and description using regex
  const authorMatch = content.match(/@author\s+([\s\S]*?)(?=\s*@title|\s*\*\/)/);
  const titleMatch = content.match(/@title\s+([\s\S]*?)(?=\s*@desc|\s*\*\/)/);
  const descMatch = content.match(/@desc\s+([\s\S]*?)(?=\s*\*\/|\s*$)/);
  
  return {
    author: authorMatch ? authorMatch[1].trim() : null,
    title: titleMatch ? titleMatch[1].trim() : null,
    description: descMatch ? descMatch[1].trim().replace(/^"|"$/g, '').replace(/\n/g, '<br>') : null
  };
};

let links = '';

for await (const path of files.scan()) {
  const info = await getemoInfo(path);
  const title = info.title || path.split('/').pop()?.replace('.ts', '') || 'Untitled';
  links += `<li class="example">
     <a href="${path.replace(".ts", ".html")}">
       <span class="example-title">${title}</span>
       <span class="example-author">by ${info.author || 'Unknown'}</span>
       <span class="example-description">${info.description || 'No description available'}</span>
     </a>
</li>\n`;
}

const html = `
<html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Play.Core Examples</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                line-height: 1.6;
                color: #333;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                padding: 20px;
            }
            
            .container {
                max-width: 1200px;
                margin: 0 auto;
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }
            
            .header {
                background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
                color: white;
                padding: 40px;
                text-align: center;
            }
            
            .header h1 {
                font-size: 3rem;
                font-weight: 700;
                margin-bottom: 10px;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            }
            
            .header p {
                font-size: 1.2rem;
                opacity: 0.9;
            }
            
            .examples {
                padding: 40px;
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
                gap: 20px;
                list-style: none;
            }
            
            .example {
                background: #f8f9fa;
                border-radius: 15px;
                overflow: hidden;
                transition: all 0.3s ease;
                border: 2px solid transparent;
            }
            
            .example:hover {
                transform: translateY(-5px);
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
                border-color: #3498db;
            }
            
            .example a {
                display: block;
                padding: 25px;
                text-decoration: none;
                color: inherit;
                height: 100%;
            }
            
            .example-title {
                font-size: 1.4rem;
                font-weight: 600;
                color: #2c3e50;
                margin-bottom: 12px;
                display: block;
            }
            
            .example-author {
                font-size: 0.9rem;
                color: #7f8c8d;
                font-weight: 500;
                margin-bottom: 8px;
                display: block;
            }
            
            .example-description {
                font-size: 1rem;
                color: #5a6c7d;
                line-height: 1.5;
                display: block;
            }
            
            .example:hover .example-title {
                color: #3498db;
            }
            
            .stats {
                background: #ecf0f1;
                padding: 20px 40px;
                text-align: center;
                color: #7f8c8d;
                font-size: 0.9rem;
            }
            
            @media (max-width: 768px) {
                .header h1 {
                    font-size: 2rem;
                }
                
                .examples {
                    grid-template-columns: 1fr;
                    padding: 20px;
                }
                
                body {
                    padding: 10px;
                }
            }
        </style>
    </head>
<body>
    <div class="container">
        <div class="header">
            <h1>Play.Core Examples</h1>
            <p>Creative coding experiments and demos</p>
        </div>
        <ul class="examples">
            ${links}
        </ul>
        <div class="stats">
            <p>${links.split('</li>').length - 1} examples available</p>
        </div>
    </div>
</body>
</html>
`;

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(`${outDir.replace("programs", "")}/index.html`, html);

// compile the run.ts file
await Bun.build({
  entrypoints: ["./run.ts"],
  outdir: `${outDir}/programs`,
  format: "esm",
  target: "browser",
  minify: {
    whitespace: true,
    syntax: true,
    identifiers: false,
    keepNames: true,
  },
});

// Build each example js file
const entrypoints: string[] = [];
for await (const path of files.scan()) {
  entrypoints.push(path);
}

await Bun.build({
  entrypoints: entrypoints,
  outdir: outDir,
  format: "esm",
  target: "browser",
  minify: false,
});

const buildExampleHtml = (path: string) => {
  const content = `
  <html>
  <style>
    * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
    }

    html,
    body {
        padding: 0;
        margin: 0;
        font-size: 1em;
        line-height: 1.2;
        font-family: 'Simple Console', monospace;
    }

    pre {
        position: absolute;
        margin: 0;
        padding: 0;
        left: 0;
        top: 0;
        width: 100vw;
        height: 100vh;
        font-family: inherit;
    }

    span {
        margin: 0;
        padding: 0;
    }

    #root {
        width: 100vw;
        height: 100vh;
        overflow: hidden;
        white-space: pre;
        z-index: -1;
        position: fixed;
        top: 0;
        left: 0;
    }
  </style>
    <body>
      <script type="module">
        import run from '/examples/out/programs/run.js'
        import * as program from '/examples/out/${path.replace(".ts", ".js")}'
        run(program, { element : document.querySelector('pre') }).then(function(e){
          console.log(e)
        }).catch(function(e) {
          console.warn(e.message)
          console.log(e.error)
        })
      </script>
      
    </body>
  </html>
  `;
  return content
}

for (const file of entrypoints) {
    const html = buildExampleHtml(file);
    const htmlPath = `${outDir}/${file.replace(".ts", ".html")}`;
    fs.writeFileSync(htmlPath, html);
}

console.log("Examples built successfully");
