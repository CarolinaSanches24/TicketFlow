export const translateAuthError = (errorMessage: string): string => {
  const errorMap: Record<string, string> = {
    'Invalid login credentials': 'Email ou senha incorretos.',
    'User not found': 'Usuário não encontrado.',
    'Email not confirmed': 'Email não confirmado. Por favor, verifique sua caixa de entrada.',
    'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres.',
    'Auth session missing!': 'Sessão de autenticação ausente.',
    'User already registered': 'Este usuário já está registrado.',
    'For security purposes, you can only request this once every 60 seconds': 'Por segurança, você só pode solicitar isso uma vez a cada 60 segundos. Aguarde um momento.',
    'Token has expired or is invalid': 'O link de recuperação expirou ou é inválido.',
    'No user found for this email': 'Nenhum usuário encontrado com este email.',
    'Invalid Default Error': 'Ocorreu um erro inesperado. Tente novamente mais tarde.'
  };

  // Check if there is an exact match
  if (errorMap[errorMessage]) {
    return errorMap[errorMessage];
  }

  // Fallback pattern matching for common issues
  if (errorMessage.toLowerCase().includes('password')) {
    return 'Erro com a senha informada. Verifique os requisitos.';
  }

  if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('fetch')) {
    return 'Erro de conexão. Verifique sua internet ou tente novamente mais tarde.';
  }

  return errorMessage; // fallback to original if completely unknown or if it's already translated
};
