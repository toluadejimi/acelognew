// OAuth with Laravel backend: configure Laravel Socialite and add routes for Google/Apple.
// This stub returns an error until you implement OAuth on the Laravel side.

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const lovable = {
  auth: {
    signInWithOAuth: async (_provider: "google" | "apple", _opts?: SignInOptions) => {
      return {
        error: new Error("OAuth is not configured. Use email/password or set up Laravel Socialite."),
      };
    },
  },
};
