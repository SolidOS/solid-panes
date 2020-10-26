interface SolidAuthorization {
  // eslint-disable-next-line camelcase
  access_token: string
  // eslint-disable-next-line camelcase
  client_id: string
  // eslint-disable-next-line camelcase
  id_token: string
}

interface SolidClaim {
  // eslint-disable-next-line camelcase
  at_hash: string
  aud: string
  azp: string
  cnf: {
    jwk: string
  }
  exp: number
  iat: number
  iss: string
  jti: string
  nonce: string
  sub: string
}

export interface SolidSession {
  authorization: SolidAuthorization
  credentialType: string
  idClaims: SolidClaim
  idp: string
  issuer: string
  sessionKey: string
  webId: string
}
