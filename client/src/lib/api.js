const baseUrl = (import.meta.env?.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')

export class ApiError extends Error {
	constructor(message, status, errors = {}) {
		super(message)
		this.status = status
		this.errors = errors
	}
}

export async function api(path, { body, ...options } = {}) {
	let response
	try {
		response = await fetch(`${baseUrl}/api${path}`, {
			credentials: 'include',
			...options,
			headers: { ...(body !== undefined && { 'Content-Type': 'application/json' }), ...options.headers },
			...(body !== undefined && { body: JSON.stringify(body) }),
		})
	} catch (error) {
		if (error.name === 'AbortError') throw error
		throw new ApiError('Unable to reach AuctionXpress. Check that the backend is running and try again.', 0)
	}
	let result
	try { result = await response.json() } catch {
		throw new ApiError('The server returned an unreadable response. Please try again.', response.status)
	}
	if (!response.ok || result.success === false) throw new ApiError(result.message || 'The request could not be completed.', response.status, result.errors)
	return result
}
