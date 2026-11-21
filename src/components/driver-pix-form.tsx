'use client';

import { AlertTriangle, Check, KeyRound, Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useDriverProfile } from '@/hooks/use-driver-profile';
import { formatPixKey } from '@/lib/pix';
import type { PixKeyType } from '@/lib/supabase/types';

const PIX_KEY_TYPES: ReadonlyArray<{
  value: PixKeyType;
  label: string;
  help: string;
  placeholder: string;
}> = [
  {
    value: 'CPF',
    label: 'CPF',
    help: '11 dígitos, com ou sem pontos.',
    placeholder: '000.000.000-00',
  },
  {
    value: 'CNPJ',
    label: 'CNPJ',
    help: '14 dígitos, com ou sem máscara.',
    placeholder: '00.000.000/0001-00',
  },
  {
    value: 'EMAIL',
    label: 'E-mail',
    help: 'O e-mail cadastrado como chave no seu banco.',
    placeholder: 'voce@email.com',
  },
  {
    value: 'TELEFONE',
    label: 'Celular',
    help: 'DDD + número. O código +55 é adicionado automaticamente.',
    placeholder: '(11) 99999-9999',
  },
  {
    value: 'ALEATORIA',
    label: 'Chave aleatória',
    help: 'Copie a chave aleatória gerada pelo seu banco.',
    placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  },
];

type FieldErrors = Partial<
  Record<'pixKey' | 'merchantName' | 'merchantCity', string>
>;

function validateKey(key: string, keyType: PixKeyType): string | null {
  const value = key.trim();
  const digits = value.replace(/\D/g, '');

  switch (keyType) {
    case 'CPF':
      return digits.length === 11 ? null : 'Informe os 11 dígitos do CPF.';
    case 'CNPJ':
      return digits.length === 14 ? null : 'Informe os 14 dígitos do CNPJ.';
    case 'TELEFONE':
      return digits.length >= 10 && digits.length <= 13
        ? null
        : 'Informe o DDD e o número com DDD (10 ou 11 dígitos).';
    case 'EMAIL':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        ? null
        : 'Informe um e-mail válido.';
    case 'ALEATORIA':
      return value.length >= 1 && value.length <= 77
        ? null
        : 'A chave aleatória deve ter até 77 caracteres.';
    default:
      return null;
  }
}

/** Formulário de chave PIX por motorista (salvo em `driver_profiles`). */
export function DriverPixForm() {
  const { profile, loading, saving, error, unavailable, save } =
    useDriverProfile();

  const [keyType, setKeyType] = useState<PixKeyType>('CPF');
  const [pixKey, setPixKey] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [merchantCity, setMerchantCity] = useState('BRASIL');
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!profile) return;

    setKeyType(profile.pix_key_type);
    setPixKey(profile.pix_key);
    setMerchantName(profile.merchant_name);
    setMerchantCity(profile.merchant_city);
  }, [profile]);

  const selectedType =
    PIX_KEY_TYPES.find((item) => item.value === keyType) ?? PIX_KEY_TYPES[0];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FieldErrors = {};

    const keyError = validateKey(pixKey, keyType);
    if (keyError) nextErrors.pixKey = keyError;

    if (merchantName.trim().length < 1 || merchantName.trim().length > 25) {
      nextErrors.merchantName =
        'Use de 1 a 25 caracteres (nome que aparece no comprovante).';
    }

    if (merchantCity.trim().length < 1 || merchantCity.trim().length > 15) {
      nextErrors.merchantCity = 'Use de 1 a 15 caracteres.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    void (async () => {
      const ok = await save({
        pix_key_type: keyType,
        pix_key: pixKey.trim(),
        merchant_name: merchantName.trim(),
        merchant_city: merchantCity.trim(),
      });

      if (ok) {
        toast.success('Chave PIX salva!', {
          description: 'O QR Code das próximas corridas usará estes dados.',
        });
      } else {
        toast.error('Não foi possível salvar a chave PIX', {
          description: 'Confira os campos e tente novamente.',
        });
      }
    })();
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border bg-card p-5 text-sm text-muted-foreground shadow-card">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Carregando sua chave PIX...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {unavailable ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            A tabela de perfis ainda não existe neste projeto. Peça ao
            administrador para rodar{' '}
            <code className="font-mono text-xs">
              supabase/migration-2.2-driver-pix.sql
            </code>{' '}
            no SQL Editor do Supabase.
          </p>
        </div>
      ) : null}

      {error && !unavailable ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-5 rounded-2xl border bg-card p-5 shadow-card sm:p-6"
      >
        <div className="space-y-2">
          <Label htmlFor="pix-key-type">Tipo de chave</Label>
          <Select
            id="pix-key-type"
            value={keyType}
            onChange={(event) => {
              setKeyType(event.target.value as PixKeyType);
              setErrors((previous) => ({ ...previous, pixKey: undefined }));
            }}
          >
            {PIX_KEY_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">{selectedType.help}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pix-key">Sua chave PIX</Label>
          <Input
            id="pix-key"
            value={pixKey}
            onChange={(event) => {
              setPixKey(event.target.value);
              setErrors((previous) => ({ ...previous, pixKey: undefined }));
            }}
            placeholder={selectedType.placeholder}
            autoComplete="off"
            aria-invalid={Boolean(errors.pixKey)}
            aria-describedby={errors.pixKey ? 'pix-key-error' : undefined}
          />
          {errors.pixKey ? (
            <p id="pix-key-error" className="text-xs text-destructive">
              {errors.pixKey}
            </p>
          ) : null}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="merchant-name">Nome no comprovante</Label>
            <Input
              id="merchant-name"
              value={merchantName}
              onChange={(event) => {
                setMerchantName(event.target.value);
                setErrors((previous) => ({
                  ...previous,
                  merchantName: undefined,
                }));
              }}
              placeholder="SEU NOME"
              maxLength={25}
              autoComplete="name"
              aria-invalid={Boolean(errors.merchantName)}
              aria-describedby={
                errors.merchantName ? 'merchant-name-error' : undefined
              }
            />
            {errors.merchantName ? (
              <p id="merchant-name-error" className="text-xs text-destructive">
                {errors.merchantName}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Até 25 caracteres, sem acentos.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="merchant-city">Cidade</Label>
            <Input
              id="merchant-city"
              value={merchantCity}
              onChange={(event) => {
                setMerchantCity(event.target.value);
                setErrors((previous) => ({
                  ...previous,
                  merchantCity: undefined,
                }));
              }}
              placeholder="BRASIL"
              maxLength={15}
              aria-invalid={Boolean(errors.merchantCity)}
              aria-describedby={
                errors.merchantCity ? 'merchant-city-error' : undefined
              }
            />
            {errors.merchantCity ? (
              <p id="merchant-city-error" className="text-xs text-destructive">
                {errors.merchantCity}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Até 15 caracteres, sem acentos.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-secondary/40 p-4">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <KeyRound className="size-3.5" aria-hidden="true" />
            Prévia do recebedor
          </p>
          <p className="mt-2 truncate font-bold text-foreground">
            {merchantName.trim() || 'SEU NOME'}
          </p>
          <p className="mt-1 break-all text-sm text-muted-foreground">
            {merchantCity.trim() || 'BRASIL'} · Chave {keyType}:{' '}
            <span className="font-mono">
              {pixKey.trim() ? formatPixKey(pixKey, keyType) : '—'}
            </span>
          </p>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={saving}>
          {saving ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Save aria-hidden="true" />
          )}
          {saving ? 'Salvando...' : 'Salvar chave PIX'}
        </Button>

        {profile ? (
          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-emerald-700 dark:text-emerald-300">
            <Check className="size-3.5" aria-hidden="true" />
            Chave cadastrada nesta conta. Você pode alterá-la quando quiser.
          </p>
        ) : null}
      </form>

      <p className="text-xs leading-relaxed text-muted-foreground">
        A chave aparece no QR Code, como exige o PIX — não é segredo. Ela fica
        vinculada somente à sua conta (RLS). Veja os{' '}
        <Link
          href="/historico"
          className="font-semibold text-accent underline-offset-2 hover:underline"
        >
          detalhes das corridas
        </Link>{' '}
        para conferir os pagamentos confirmados.
      </p>
    </div>
  );
}
