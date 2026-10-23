export type UnifespSession = {
  cookies: Map<string, string>;
  bearer: string;
  csrfToken: string;
  expiresAt: Date;
};

export type UnifespSearchHit = {
  name: string;
  ra: string | null;
  loginIntranet: string | null;
  maskedCpf: string | null;
  handle: string;
};

export type UnifespProfile = {
  name: string;
  email: string | null;
  photoPath: string | null;
  course: string | null;
  entryYear: number | null;
};
