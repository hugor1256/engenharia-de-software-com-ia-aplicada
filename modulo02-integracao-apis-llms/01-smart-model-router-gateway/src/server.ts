import Fastify from "fastify";
import { OpenRouterService } from "./openrouterService.ts";

export const createServer = (routerService: OpenRouterService ) => {
    const app = Fastify({ logger: false })

    app.get('/', async (_request, reply) => {
        const html = `<!doctype html>
<html lang="pt-br">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Smart Model Router</title>
    <style>
      :root { color-scheme: light; }
      body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Arial, sans-serif; margin: 40px; background: #f6f7fb; color: #111; }
      .card { max-width: 780px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 8px 24px rgba(0,0,0,.08); }
      h1 { margin: 0 0 8px; font-size: 22px; }
      p { margin: 0 0 16px; color: #444; }
      textarea { width: 100%; min-height: 120px; padding: 12px; border-radius: 8px; border: 1px solid #ddd; font-size: 14px; }
      button { margin-top: 12px; padding: 10px 16px; border: 0; border-radius: 8px; background: #1f3a93; color: #fff; font-weight: 600; cursor: pointer; }
      button:disabled { opacity: .6; cursor: not-allowed; }
      pre { background: #0f172a; color: #e2e8f0; padding: 16px; border-radius: 8px; white-space: pre-wrap; }
      .meta { margin-top: 8px; font-size: 12px; color: #666; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Smart Model Router</h1>
      <p>Digite uma pergunta e veja a resposta do modelo via OpenRouter.</p>
      <textarea id="question" placeholder="Ex.: Explique rate limiting em uma frase."></textarea>
      <button id="send">Enviar</button>
      <div class="meta" id="status"></div>
      <h3>Resposta</h3>
      <pre id="output">(aguardando)</pre>
    </div>
    <script>
      const btn = document.getElementById('send');
      const question = document.getElementById('question');
      const output = document.getElementById('output');
      const status = document.getElementById('status');

      btn.addEventListener('click', async () => {
        const text = question.value.trim();
        if (text.length < 5) {
          status.textContent = 'Pergunta muito curta (mínimo 5 caracteres).';
          return;
        }
        btn.disabled = true;
        status.textContent = 'Enviando...';
        output.textContent = '(aguardando)';
        try {
          const res = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: text })
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data?.message || 'Erro na requisição');
          }
          output.textContent = data?.content ?? '(sem conteúdo)';
          status.textContent = 'Modelo: ' + (data?.model ?? 'desconhecido');
        } catch (err) {
          output.textContent = String(err);
          status.textContent = 'Falha ao obter resposta.';
        } finally {
          btn.disabled = false;
        }
      });
    </script>
  </body>
</html>`;
        return reply.type('text/html').send(html)
    })

    app.post('/chat', {
        schema: {
            body: {
                type: 'object',
                required: ['question'],
                properties:  {
                    question: { type: 'string', minLength: 5}
                }
            }
        }
    }, async (request, reply) => {
        try {

            const { question } = request.body as { question: string }
            const response = await routerService.generate(question)
            return reply.send(response)
        } catch (error) {
            console.error('Error handling /chat request:', error)
            return reply.code(500)
        }
    })

    return app
}
