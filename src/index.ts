import http from "node:http";

const PORT = 8080;

const server = http.createServer((request, response) => {
  const { url, method, headers } = request
  const path = url.split('?')[0]
  const params = url.split('?')[1].split('&').map(param => param.split('='))
  console.log("method", method)
  console.log("path", path)
  console.log("params", params)

  if (path === '/products' && method === 'GET') {
    response.writeHead(200, { 'Content-Type': 'application/json' })
    return response.end(JSON.stringify({ data: [{ id: 1, name: "Product 1" }] }))
  }

  if (path === '/products' && method === 'POST') {
    const bodyBuffer = []
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
server.listen(PORT, () => {
  console.log(`Servidor em http://localhost:${PORT}`);
});
