
//this code will need to be moved later
import { ACL_LINK } from 'solid-logic'
import { ns } from 'solid-ui'
import type { LiveStore, NamedNode } from 'rdflib'

export type FileExplorerResourceMetadata = {
	contentType: string | undefined
	canEdit: boolean
	isPublic: boolean
	aclUri: string | undefined
	eTag: string | undefined
	modified: string | undefined
}

function parseWacAllowHeader (headerValue: string | null | undefined) {
	const permissions = new Map<string, Set<string>>()
	if (!headerValue) return permissions

	for (const entry of headerValue.split(',')) {
		const match = entry.trim().match(/^([A-Za-z]+)\s*=\s*"([^"]*)"$/)
		if (match) {
			const [, permissionGroup, accessModes] = match
			const modes = accessModes.trim().split(/\s+/).filter(Boolean)
			permissions.set(permissionGroup.toLowerCase(), new Set(modes.map(mode => mode.toLowerCase())))
		}
	}

	return permissions
}

function deriveAccessFlags (wacAllow: string | null | undefined) {
	if (!wacAllow) {
		return { canEdit: false, isPublic: false }
	}

	const permissions = parseWacAllowHeader(wacAllow)
	const userModes = permissions.get('user') ?? new Set<string>()
	const publicModes = permissions.get('public') ?? new Set<string>()

	return {
		canEdit: userModes.has('write'),
		isPublic: publicModes.has('read') || publicModes.has('write')
	}
}

export function getResponseMetadata (store: LiveStore, subject: NamedNode, response: Response): FileExplorerResourceMetadata {
	let contentType: string | undefined
	let canEdit = false
	let isPublic = false
	let aclUri: string | undefined
	let eTag: string | undefined
	let modified: string | undefined

	if (response.headers && response.headers.get('content-type')) {
		contentType = response.headers.get('content-type')?.split(';')[0] ?? undefined
		const accessFlags = deriveAccessFlags(response.headers.get('wac-allow'))

		canEdit = accessFlags.canEdit
		isPublic = accessFlags.isPublic
		eTag = response.headers.get('etag') ?? undefined
		modified = store.anyValue(subject as any, ns.dct('modified')) || store.anyValue(subject as any, ns.dc('modified')) || undefined
	} else {
		const reqs = store.each(
			null,
			store.sym('http://www.w3.org/2007/ont/link#requestedURI'),
			subject
		)
		reqs.forEach((req: any) => {
			const responseNode = store.any(
				req as any,
				store.sym('http://www.w3.org/2007/ont/link#response')
			)
			if (responseNode && responseNode.termType === 'NamedNode') {
				contentType = store.anyValue(responseNode as any, ns.httph('content-type')) || undefined
				const wacAllow = (store.anyValue(responseNode as any, ns.httph('wac-allow')) as string | undefined)
					|| (store.anyValue(responseNode as any, ns.httph('WAC-Allow')) as string | undefined)
				const accessFlags = deriveAccessFlags(wacAllow)
				canEdit = accessFlags.canEdit
				isPublic = accessFlags.isPublic
				eTag = store.anyValue(responseNode as any, ns.httph('etag')) || undefined
				modified = store.anyValue(subject as any, ns.dct('modified')) || store.anyValue(subject as any, ns.dc('modified')) || undefined
			}
		})
	}

	aclUri = store.any(subject, ACL_LINK)?.value || undefined
	return { contentType, canEdit, isPublic, aclUri, eTag, modified }
}

export async function fetchContentAndMetadata (store: LiveStore, subject: NamedNode): Promise<{ content: string, metadata: FileExplorerResourceMetadata }> {
	const fetcher = store.fetcher

	const response = await fetcher.webOperation('GET', subject.uri)
	const content = (response as Response & { responseText?: string }).responseText

	if (content === undefined) {
		throw new Error('No text in response object!!')
	}

	const metadata = getResponseMetadata(store, subject, response)
	if (!metadata.contentType) {
		throw new Error('No content-type available!')
	}

	return { content, metadata }
}

