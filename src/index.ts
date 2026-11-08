import http from "node:http";

const { API_PORT, API_HOST, API_PROTOCOL } = process.env

const posts: any[] = []

const server = http.createServer((request, response) => {
  const { url, method, headers } = request
  const paths = url?.split('?').filter(Boolean)
  const path = paths?.at(0) ?? '/'


  if (path === '/posts' && method === 'GET') {
    response.writeHead(200, { 'Content-Type': 'application/json' })
    return response.end(JSON.stringify({ data: posts }))
  }

  if (path === '/products' && method === 'POST') {
    const bodyBuffer: Buffer[] = []
    let body = null
    
    // Armazena o corpo da requisição em um array
    request.on('data', chunk => bodyBuffer.push(chunk))
    request.on('end', () => {
      const bodyString = Buffer.concat(bodyBuffer).toString()
      body = JSON.parse(bodyString)

      response.writeHead(201, { 'Content-Type': 'application/json' })
      return response.end(JSON.stringify({ message: "Product created", body }))
    })

    return;
  }

  response.writeHead(404, { 'Content-Type': 'application/json' })
  return response.end(JSON.stringify({ message: "Not Found" })) 
})
server.listen(API_PORT, () => {
  console.log(`Servidor em ${API_PROTOCOL}://${API_HOST}:${API_PORT}`);
  console.log("Press CTRL+C to stop");
});
