import path from 'node:path';
export const providers = {
 codex:{label:'Codex',image:'codex'},
 claude:{label:'Claude Code',image:'claude-code'},
 gemini:{label:'Gemini CLI',image:'https://geminicli.com/icon.png'},
 opencode:{label:'OpenCode',image:'https://opencode.ai/apple-touch-icon-v3.png'},
 aider:{label:'Aider',image:'https://aider.chat/assets/aider-square.jpg'},
 goose:{label:'Goose',image:'https://goose.vcorp.ai/img/goose-logo-black.png'},
 copilot:{label:'GitHub Copilot',image:'https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@2.5.0/dark/githubcopilot.png'},
 'cursor-agent':{label:'Cursor',image:'https://cursor.com/marketing-static/icon-192x192-light.png'},
 agent:{label:'Cursor',image:'https://cursor.com/marketing-static/icon-192x192-light.png'}
};
export function provider(command) {
 const name=path.basename(command).replace(/\.(exe|cmd)$/i,'');
 return providers[name] ?? {label:name,image:'ship-signal'};
}
