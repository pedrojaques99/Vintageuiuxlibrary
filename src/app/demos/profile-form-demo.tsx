"use client";

/**
 * O perfil com um servidor de mentira, mas com o tempo de verdade.
 *
 * O `onSave` espera 900ms de propósito: um save instantâneo esconde o estado de
 * "salvando", que é metade do que a peça vende. E o e-mail perde o selo de
 * verificado quando o endereço muda — a consequência que o campo já avisava
 * antes de salvar acontece de fato, senão o aviso seria decorativo.
 *
 * Um segundo campo de validação (`validate`) recusa e-mail de descartável: é o
 * gancho de regra de negócio que quem instala vai usar, e sem ele a demo só
 * mostraria a validação de formato, que todo form tem.
 */

import * as React from "react";

import { ProfileForm, type ProfileValue } from "../../../registry/visant/ui/profile-form";
import { midia } from "../media";
import type { DemoProps } from "../catalog";

const INICIAL: ProfileValue = {
  name: "Marina Duarte",
  email: "marina@estudioarco.com.br",
  avatarUrl: midia("retrato", 1)?.src ?? null,
};

export default function ProfileFormDemo({ props }: DemoProps) {
  const [valor, setValor] = React.useState<ProfileValue>(INICIAL);
  const [verificado, setVerificado] = React.useState(true);

  return (
    <div className="flex h-full w-full items-center p-5">
      <ProfileForm
        value={valor}
        emailVerified={verificado}
        onResendVerification={() => setVerificado(true)}
        validate={(d) =>
          /@(mailinator|tempmail|guerrillamail)\./i.test(d.email)
            ? { email: "E-mail descartável não serve para recuperar a conta." }
            : {}
        }
        onSave={async (proximo, { avatarFile }) => {
          await new Promise((r) => setTimeout(r, 900));
          setVerificado((v) => (proximo.email === valor.email ? v : false));
          setValor({
            ...proximo,
            // Sem backend: a foto escolhida vira URL local só pra prévia
            // sobreviver ao save. Em produção quem devolve a URL é o upload.
            avatarUrl: avatarFile ? URL.createObjectURL(avatarFile) : proximo.avatarUrl,
          });
        }}
        {...props}
      />
    </div>
  );
}
