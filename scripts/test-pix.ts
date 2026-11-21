import assert from 'node:assert/strict';

import {
  buildPixPayload,
  crc16,
  createPixTxid,
  formatPixKey,
  normalizePixKey,
} from '../src/lib/pix';
import type { PixKeyType } from '../src/lib/supabase/types';

let failures = 0;

function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`OK   ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${name}`);
    console.error(' ', error instanceof Error ? error.message : error);
  }
}

/** Lê os campos TLV do BR Code (id(2) + tamanho(2) + valor). */
function parseEmv(payload: string): Map<string, string> {
  const fields = new Map<string, string>();
  let index = 0;

  while (index + 4 <= payload.length) {
    const id = payload.slice(index, index + 2);
    const length = Number(payload.slice(index + 2, index + 4));

    if (!Number.isInteger(length) || index + 4 + length > payload.length) {
      break;
    }

    fields.set(id, payload.slice(index + 4, index + 4 + length));
    index += 4 + length;

    if (id === '63') break;
  }

  return fields;
}

function merchantKey(payload: string): string {
  const account = parseEmv(payload).get('26') ?? '';
  return parseEmv(account).get('01') ?? '';
}

const base = {
  amount: 12.5,
  txid: 'CORRIDA123',
  merchantName: 'JOAO SILVA',
  merchantCity: 'SAO PAULO',
};

function payloadFor(key: string, keyType: PixKeyType): string {
  return buildPixPayload({ ...base, key, keyType });
}

check('CRC16-CCITT-FALSE confere com o vetor conhecido', () => {
  assert.equal(crc16('123456789'), '29B1');
});

check('CPF é gravado no BR Code somente com dígitos', () => {
  assert.equal(merchantKey(payloadFor('123.456.789-09', 'CPF')), '12345678909');
});

check('CNPJ é gravado no BR Code somente com dígitos', () => {
  assert.equal(
    merchantKey(payloadFor('12.345.678/0001-90', 'CNPJ')),
    '12345678000190',
  );
});

check('e-mail é minúsculo e sem espaços', () => {
  const key = normalizePixKey('  Joao.Silva@Email.com ', 'EMAIL');
  assert.equal(key, 'joao.silva@email.com');
  assert.equal(merchantKey(payloadFor(' Joao.Silva@Email.com ', 'EMAIL')), key);
});

check('celular recebe o prefixo 55 quando tem 11 dígitos', () => {
  assert.equal(normalizePixKey('(11) 99999-9999', 'TELEFONE'), '5511999999999');
  assert.equal(
    merchantKey(payloadFor('(11) 99999-9999', 'TELEFONE')),
    '5511999999999',
  );
  assert.equal(
    normalizePixKey('+55 11 99999-9999', 'TELEFONE'),
    '5511999999999',
  );
});

check('chave aleatória mantém hífens e caixa', () => {
  const key = 'AbCdEf12-3456-7890-abcd-ef1234567890';
  assert.equal(normalizePixKey(key, 'ALEATORIA'), key);
  assert.equal(merchantKey(payloadFor(key, 'ALEATORIA')), key);
});

check('máscaras de exibição por tipo', () => {
  assert.equal(formatPixKey('12345678909', 'CPF'), '123.456.789-09');
  assert.equal(
    formatPixKey('12345678000190', 'CNPJ'),
    '12.345.678/0001-90',
  );
  assert.equal(
    formatPixKey('11999999999', 'TELEFONE'),
    '+55 (11) 99999-9999',
  );
});

check('payload traz valor, moeda, recebedor, cidade e CRC válido', () => {
  const payload = payloadFor('12345678909', 'CPF');
  const fields = parseEmv(payload);

  assert.equal(fields.get('54'), '12.50');
  assert.equal(fields.get('53'), '986');
  assert.equal(fields.get('58'), 'BR');
  assert.equal(fields.get('59'), 'JOAO SILVA');
  assert.equal(fields.get('60'), 'SAO PAULO');
  assert.match(fields.get('63') ?? '', /^[0-9A-F]{4}$/);
  assert.equal(crc16(payload.slice(0, -4)), fields.get('63'));
});

check('chave vazia é recusada em vez de gerar BR Code inválido', () => {
  assert.throws(
    () => payloadFor('   ', 'CPF'),
    /Cadastre sua chave PIX/,
  );
});

check('txid é alfanumérico e limitado a 25 caracteres', () => {
  const txid = createPixTxid('corrida-123');
  assert.ok(txid.length <= 25);
  assert.match(txid, /^[A-Z0-9]+$/);
});

if (failures > 0) {
  console.error(`\n${failures} teste(s) de PIX falharam.`);
  process.exit(1);
}

console.log('\nTodos os testes de PIX passaram.');
