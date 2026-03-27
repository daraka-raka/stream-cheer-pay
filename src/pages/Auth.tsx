import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { Link } from "react-router-dom";

const Auth = () => {
  const { signUp, signIn, signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  const [signUpData, setSignUpData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
  });

  const [signInData, setSignInData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordRequirements = [
    { label: "Mínimo 8 caracteres", test: (p: string) => p.length >= 8 },
    { label: "Letra maiúscula", test: (p: string) => /[A-Z]/.test(p) },
    { label: "Letra minúscula", test: (p: string) => /[a-z]/.test(p) },
    { label: "Número", test: (p: string) => /[0-9]/.test(p) },
    { label: "Caractere especial (!@#$%)", test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
  ];

  const isPasswordValid = passwordRequirements.every(req => req.test(signUpData.password));
  const passwordsMatch = signUpData.password === signUpData.confirmPassword && signUpData.confirmPassword !== "";

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid || !passwordsMatch) return;
    setLoading(true);
    await signUp(signUpData.email, signUpData.password, signUpData.displayName);
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await signIn(signInData.email, signInData.password);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-[rgba(167,139,250,0.5)] text-2xl">⚡</span>
            <h1 className="font-display text-3xl font-extrabold text-foreground">
              Streala
            </h1>
          </div>
          <CardTitle className="font-display">Acesse sua conta</CardTitle>
          <CardDescription className="font-body font-light">Entre ou crie uma nova conta de streamer</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin" className="font-body">Entrar</TabsTrigger>
              <TabsTrigger value="signup" className="font-body">Criar Conta</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="font-body text-sm">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={signInData.email}
                    onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                    required
                    className="font-body bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.09)] focus:border-[rgba(167,139,250,0.45)] rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="font-body text-sm">Senha</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={signInData.password}
                    onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                    required
                    className="font-body bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.09)] focus:border-[rgba(167,139,250,0.45)] rounded-lg"
                  />
                </div>
                <Button type="submit" className="w-full font-body font-medium" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-[rgba(255,255,255,0.06)]" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground font-body">ou</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full font-body"
                onClick={signInWithGoogle}
                disabled={loading}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Entrar com Google
              </Button>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="font-body text-sm">Nome de Exibição</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Seu nome no Streala"
                    value={signUpData.displayName}
                    onChange={(e) => setSignUpData({ ...signUpData, displayName: e.target.value })}
                    required
                    className="font-body bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.09)] focus:border-[rgba(167,139,250,0.45)] rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="font-body text-sm">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={signUpData.email}
                    onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                    required
                    className="font-body bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.09)] focus:border-[rgba(167,139,250,0.45)] rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="font-body text-sm">Senha</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={signUpData.password}
                      onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                      required
                      className="pr-10 font-body bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.09)] focus:border-[rgba(167,139,250,0.45)] rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  </div>
                  
                  {signUpData.password.length > 0 && (
                    <div className="space-y-1.5 mt-3 p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]">
                      <p className="text-xs font-body text-muted-foreground mb-2">Requisitos da senha:</p>
                      {passwordRequirements.map((req, index) => {
                        const passed = req.test(signUpData.password);
                        return (
                          <div key={index} className="flex items-center gap-2 text-xs font-body">
                            {passed ? <Check className="h-3.5 w-3.5 text-green-500" /> : <X className="h-3.5 w-3.5 text-muted-foreground" />}
                            <span className={passed ? "text-green-500" : "text-muted-foreground"}>{req.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password" className="font-body text-sm">Confirmar Senha</Label>
                  <div className="relative">
                    <Input
                      id="signup-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={signUpData.confirmPassword}
                      onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
                      required
                      className="pr-10 font-body bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.09)] focus:border-[rgba(167,139,250,0.45)] rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  </div>
                  {signUpData.confirmPassword && !passwordsMatch && (
                    <p className="text-xs text-destructive flex items-center gap-1 font-body"><X className="h-3 w-3" /> As senhas não coincidem</p>
                  )}
                  {passwordsMatch && (
                    <p className="text-xs text-green-500 flex items-center gap-1 font-body"><Check className="h-3 w-3" /> Senhas coincidem</p>
                  )}
                </div>

                <Button type="submit" className="w-full font-body font-medium" disabled={loading || !isPasswordValid || !passwordsMatch}>
                  {loading ? "Criando..." : "Criar Conta"}
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-[rgba(255,255,255,0.06)]" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground font-body">ou</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full font-body"
                onClick={signInWithGoogle}
                disabled={loading}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Cadastrar com Google
              </Button>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center text-sm text-muted-foreground font-body">
            <Link to="/" className="hover:text-primary transition-colors">
              ← Voltar para home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
