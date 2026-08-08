export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/api/hello') {
      return Response.json({
        message: 'hello from the worker',
        time: new Date().toISOString(),
      })
    }

    return Response.json({ error: 'not found' }, { status: 404 })
  },
}
