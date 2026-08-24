import type { Metadata } from 'next';
import Link from 'next/link';

/**
 * Términos de uso y descargo de responsabilidad.
 *
 * ES EL PENDIENTE MÁS VIEJO DEL PROYECTO: quedó anotado en el Sprint 0, se
 * repitió en el Sprint 3 cuando apareció la estimación de precio, y no podía
 * seguir abierto el día que la aplicación se abra a gente que no conocemos.
 * Alguien que toma una decisión de plata mirando un número que le mostramos
 * tiene derecho a saber de dónde sale ese número y qué no es.
 *
 * POR QUÉ NO ESTÁ ESCRITO EN ABOGADO. La plataforma le habla a la gente en
 * castellano en todas las demás pantallas; un texto legal que nadie puede leer
 * cumple con la formalidad y no con lo que la formalidad busca. Cada punto dice
 * qué hace la plataforma, qué no hace, y qué queda en manos de quien la usa.
 *
 * ES UNA PÁGINA ESTÁTICA: no necesita sesión. Un descargo que solo se puede
 * leer después de crear una cuenta llega tarde.
 */

export const metadata: Metadata = {
  title: 'Términos y responsabilidad — AIassistant',
  description:
    'Qué hace AIassistant, qué no hace, y qué alcance tienen las estimaciones de precio y el análisis de fotos.',
};

const ACTUALIZADO = '24 de agosto de 2026';

export default function LegalesPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8 pb-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Términos y responsabilidad</h1>
        <p className="text-sm text-muted">Última actualización: {ACTUALIZADO}.</p>
        <p className="text-body">
          En una operación entre dos personas que no se conocen, lo que la plataforma dice de más
          puede costar plata. Esta página es lo que AIassistant hace, lo que no hace, y qué queda
          en manos de cada uno.
        </p>
      </header>

      <Seccion titulo="Qué es AIassistant, y qué no">
        <p>
          Es un lugar donde una persona publica un vehículo y otra lo encuentra. Nada más que eso:{' '}
          <strong className="font-semibold text-ink">no vendemos vehículos</strong>, no somos parte
          de la operación, no intervenimos en el pago ni en la entrega, no cobramos comisiones y no
          representamos a ninguna de las dos partes.
        </p>
        <p>
          La compraventa la acuerdan el comprador y el vendedor entre ellos, y sus consecuencias son
          de ellos. La plataforma no verifica la identidad de quien publica, ni que el vehículo
          exista, ni que sea suyo, ni que esté libre de deuda o de gravámenes.
        </p>
      </Seccion>

      <Seccion titulo="El precio de referencia es una referencia, no una tasación">
        <p>
          Cuando hay datos suficientes, cada aviso muestra un rango de lo que se está pidiendo por
          vehículos parecidos. Ese número{' '}
          <strong className="font-semibold text-ink">sale de precios pedidos, no de ventas</strong>:
          de las publicaciones de esta misma plataforma —corregidas por año y por kilómetros— y de
          una fuente externa gratuita, cuando cubre ese vehículo.
        </p>
        <p>Eso significa, concretamente:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            No es una tasación, ni un peritaje, ni el valor por el que el vehículo se va a vender.
          </li>
          <li>
            No dice si conviene comprar. Dice contra qué se comparó y qué dio — la lista de avisos
            está a la vista, abajo de cada estimación, para que se pueda discutir.
          </li>
          <li>
            No tiene en cuenta el estado real del vehículo, su historial, ni nada que las fotos y
            los datos declarados no muestren.
          </li>
          <li>
            Cuando hay pocos comparables, la pantalla lo dice. Un rango calculado con dos avisos es
            un orden de magnitud, no un precio.
          </li>
        </ul>
        <p>
          Decidir cuánto pagar o cuánto pedir por un vehículo es de quien compra y de quien vende.
          AIassistant no asume responsabilidad por decisiones tomadas a partir de estas
          estimaciones.
        </p>
      </Seccion>

      <Seccion titulo="El análisis de fotos lo hace un programa, y se puede equivocar">
        <p>
          El botón &ldquo;Analizar&rdquo; le pasa las fotos y los datos declarados a un modelo de
          inteligencia artificial, que devuelve qué se ve, qué no cierra con lo declarado, qué no se
          puede evaluar desde una foto y qué convendría preguntar.
        </p>
        <p>
          <strong className="font-semibold text-ink">
            No reemplaza ver el vehículo, revisarlo con un mecánico ni pedir un informe de dominio.
          </strong>{' '}
          Un modelo mirando fotos puede pasar por alto un problema grave y también puede marcar como
          raro algo que tiene una explicación simple. Que el análisis no encuentre nada no quiere
          decir que no haya nada.
        </p>
        <p>
          Lo mismo vale para el asistente conversacional: orienta, no dictamina, y no ve el vehículo
          — lee lo que está publicado.
        </p>
      </Seccion>

      <Seccion titulo="Las publicaciones las escriben las personas que venden">
        <p>
          Los datos de cada aviso —marca, modelo, año, kilómetros, estado, fotos— los carga quien
          publica. La plataforma no los verifica y no puede garantizar que sean ciertos. Si algo no
          cierra, preguntá antes de avanzar; el análisis de fotos existe justamente para ayudar a
          encontrar esas preguntas.
        </p>
      </Seccion>

      <Seccion titulo="Los mensajes son privados, y quedan">
        <p>
          Una conversación la ven sus dos participantes y nadie más. No la lee el asistente de IA,
          no se usa para recomendar nada, y no hay forma —dentro de la plataforma ni desde la base
          de datos— de contar cuántas personas preguntaron por un aviso.
        </p>
        <p>
          Los mensajes{' '}
          <strong className="font-semibold text-ink">no se editan ni se borran</strong>, a propósito:
          lo que se dijo en una negociación es prueba para el otro, y es lo que hay que poder mostrar
          si algo sale mal.
        </p>
        <p>
          En cualquier conversación se puede{' '}
          <strong className="font-semibold text-ink">bloquear</strong> a la otra persona —corta los
          mensajes en las dos direcciones, y se puede deshacer— y{' '}
          <strong className="font-semibold text-ink">denunciar</strong> la conversación, que la deja
          registrada para que la revisemos. Las dos cosas están al pie de cada conversación.
        </p>
      </Seccion>

      <Seccion titulo="Qué datos tuyos se guardan">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="font-semibold text-ink">Tu teléfono es privado.</strong> Se guarda
            solo si lo cargás, no aparece en ningún aviso y no viaja al navegador de nadie más.
          </li>
          <li>
            <strong className="font-semibold text-ink">Tus guardados son privados.</strong> Nadie
            puede ver ni contar cuántas personas guardaron un vehículo, tampoco quien lo publicó.
          </li>
          <li>
            Los datos viven en Supabase (Postgres), con reglas de acceso que se aplican en la propia
            base y no solo en la aplicación.
          </li>
          <li>
            Las fotos que subís a una publicación son públicas mientras el aviso lo esté: cualquiera
            con el enlace las puede ver.
          </li>
        </ul>
      </Seccion>

      <Seccion titulo="Antes de cerrar una operación">
        <p>
          Nada de esto es asesoramiento legal ni financiero, pero es lo que cualquiera que compró un
          vehículo usado hubiera querido que le dijeran:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Ver el vehículo en persona y revisarlo con alguien que sepa.</li>
          <li>Pedir el informe de dominio y verificar que quien vende sea el titular.</li>
          <li>No pagar por adelantado ni señar sin haber visto el vehículo.</li>
          <li>
            Desconfiar de un precio mucho más bajo que el de vehículos parecidos, y del apuro:
            &ldquo;lo tengo que vender hoy&rdquo; es el argumento más usado en las estafas.
          </li>
          <li>
            La plataforma nunca te va a pedir dinero, ni datos de tu tarjeta, ni tu contraseña, por
            mensaje.
          </li>
        </ul>
      </Seccion>

      <Seccion titulo="La aplicación está en pruebas">
        <p>
          AIassistant está en desarrollo. Puede tener errores, puede cambiar, y puede dejar de estar
          disponible sin aviso. El servicio se ofrece &ldquo;tal como está&rdquo;.
        </p>
      </Seccion>

      <Seccion titulo="Dudas">
        <p>
          Si algo de esto no queda claro, o si viste algo que no corresponde en la plataforma,
          contanos. Una denuncia desde la conversación es la vía más directa cuando el problema es
          con otra persona.
        </p>
      </Seccion>

      <footer className="border-t border-line pt-6">
        <Link href="/" className="text-sm font-medium text-brand-deep hover:underline">
          ← Volver al inicio
        </Link>
      </footer>
    </article>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-ink">{titulo}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-body">{children}</div>
    </section>
  );
}
