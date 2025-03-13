export interface AccountData {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: string;
  id_token: string;
  expires_at: number;
  provider: string;
  type: string;
  providerAccountId: string;
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  image: string;
}

export interface UserProfile {
  iss: string;
  azp: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: boolean;
  at_hash: string;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
  iat: number;
  exp: number;
}

export interface Session {
  user: {
    name: string;
    email: string;
    image: string;
  };
  expires: string;
}
