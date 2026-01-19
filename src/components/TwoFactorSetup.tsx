import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Shield, ShieldCheck, Copy, QrCode, Loader2 } from 'lucide-react';

interface TwoFactorSetupProps {
  userId: string;
}

const TwoFactorSetup = ({ userId }: TwoFactorSetupProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'intro' | 'setup' | 'verify' | 'complete'>('intro');
  const [loading, setLoading] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const { toast } = useToast();

  const checkExisting2FA = async () => {
    try {
      const { data: factors, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      
      const activeFactor = factors.totp?.find(f => f.status === 'verified');
      setIs2FAEnabled(!!activeFactor);
    } catch (error) {
      console.error('Error checking 2FA status:', error);
    }
  };

  const startSetup = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'The Truth App'
      });

      if (error) throw error;

      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setStep('setup');
    } catch (error: any) {
      toast({
        title: 'Setup Failed',
        description: error.message || 'Failed to start 2FA setup',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const verifySetup = async () => {
    if (!factorId || verifyCode.length !== 6) {
      toast({
        title: 'Invalid Code',
        description: 'Please enter a valid 6-digit code',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: verifyCode
      });

      if (verifyError) throw verifyError;

      setStep('complete');
      setIs2FAEnabled(true);
      toast({
        title: '2FA Enabled!',
        description: 'Two-factor authentication has been successfully enabled.'
      });
    } catch (error: any) {
      toast({
        title: 'Verification Failed',
        description: error.message || 'Invalid verification code',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const disable2FA = async () => {
    setLoading(true);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const activeFactor = factors.totp?.find(f => f.status === 'verified');
      
      if (activeFactor) {
        const { error } = await supabase.auth.mfa.unenroll({ factorId: activeFactor.id });
        if (error) throw error;
      }

      setIs2FAEnabled(false);
      toast({
        title: '2FA Disabled',
        description: 'Two-factor authentication has been disabled.'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to disable 2FA',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      toast({
        title: 'Copied!',
        description: 'Secret key copied to clipboard'
      });
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      checkExisting2FA();
      setStep('intro');
      setVerifyCode('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          {is2FAEnabled ? (
            <>
              <ShieldCheck className="w-4 h-4 text-green-500" />
              2FA Enabled
            </>
          ) : (
            <>
              <Shield className="w-4 h-4" />
              Enable 2FA
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Two-Factor Authentication
          </DialogTitle>
        </DialogHeader>

        {step === 'intro' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Add an extra layer of security to your account by requiring a verification code 
              in addition to your password when you sign in.
            </p>
            
            {is2FAEnabled ? (
              <div className="space-y-4">
                <Card className="bg-green-500/10 border-green-500/20">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <ShieldCheck className="w-5 h-5" />
                      <span className="font-medium">2FA is currently enabled</span>
                    </div>
                  </CardContent>
                </Card>
                <Button 
                  variant="destructive" 
                  onClick={disable2FA}
                  disabled={loading}
                  className="w-full"
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Disable Two-Factor Authentication
                </Button>
              </div>
            ) : (
              <Button onClick={startSetup} disabled={loading} className="w-full">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Set Up Two-Factor Authentication
              </Button>
            )}
          </div>
        )}

        {step === 'setup' && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>1. Download an authenticator app like Google Authenticator or Authy</p>
              <p>2. Scan the QR code below or enter the secret key manually</p>
            </div>

            {qrCode && (
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
              </div>
            )}

            {secret && (
              <div className="space-y-2">
                <Label>Secret Key (manual entry)</Label>
                <div className="flex gap-2">
                  <Input 
                    value={secret} 
                    readOnly 
                    className="font-mono text-xs"
                  />
                  <Button variant="outline" size="icon" onClick={copySecret}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            <Button onClick={() => setStep('verify')} className="w-full">
              Continue to Verification
            </Button>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code from your authenticator app to complete setup.
            </p>

            <div className="space-y-2">
              <Label htmlFor="verify-code">Verification Code</Label>
              <Input
                id="verify-code"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="text-center text-2xl tracking-widest font-mono"
                maxLength={6}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('setup')} className="flex-1">
                Back
              </Button>
              <Button 
                onClick={verifySetup} 
                disabled={loading || verifyCode.length !== 6}
                className="flex-1"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Verify
              </Button>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 mx-auto bg-green-500/10 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">All Set!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Two-factor authentication is now enabled. You'll need to enter a code 
                from your authenticator app when you sign in.
              </p>
            </div>
            <Button onClick={() => setIsOpen(false)} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TwoFactorSetup;