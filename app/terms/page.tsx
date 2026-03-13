"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/language";

export default function TermsPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-mentiva-gradient">
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "3rem 1.5rem 4rem",
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}
      >
        {/* Header */}
        <header style={{ marginBottom: "3rem" }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
              color: "#6B7E5C",
              fontSize: "0.85rem",
              fontWeight: 500,
              marginBottom: "1.5rem",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            {t("Back to Mentiva", "Volver a Mentiva")}
          </Link>
          <h1
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 500,
              fontSize: "clamp(1.8rem, 4vw, 2.4rem)",
              color: "#2C3028",
              marginBottom: "0.5rem",
            }}
          >
            {t("Terms of Service", "Terminos de Servicio")}
          </h1>
          <p style={{ color: "#5A6352", fontSize: "0.9rem" }}>
            {t("Effective date: March 2026", "Fecha de vigencia: marzo 2026")}
          </p>
        </header>

        {/* Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {/* 1. Acceptance */}
          <section>
            <h2
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontWeight: 500,
                fontSize: "1.25rem",
                color: "#2C3028",
                marginBottom: "0.75rem",
              }}
            >
              {t("1. Acceptance of Terms", "1. Aceptacion de los Terminos")}
            </h2>
            <p style={{ color: "#5A6352", fontSize: "0.9rem", lineHeight: 1.7 }}>
              {t(
                "By accessing or using Mentiva (\"the Service\"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service. We may update these terms from time to time, and your continued use of the Service constitutes acceptance of any changes.",
                "Al acceder o usar Mentiva (\"el Servicio\"), aceptas estar sujeto a estos Terminos de Servicio. Si no estas de acuerdo con estos terminos, por favor no uses el Servicio. Podemos actualizar estos terminos de vez en cuando, y tu uso continuado del Servicio constituye la aceptacion de cualquier cambio."
              )}
            </p>
          </section>

          {/* 2. Description of Service */}
          <section>
            <h2
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontWeight: 500,
                fontSize: "1.25rem",
                color: "#2C3028",
                marginBottom: "0.75rem",
              }}
            >
              {t("2. Description of Service", "2. Descripcion del Servicio")}
            </h2>
            <p style={{ color: "#5A6352", fontSize: "0.9rem", lineHeight: 1.7 }}>
              {t(
                "Mentiva is an AI-powered wellness coaching application that helps you create and manage vision boards, complete daily missions, journal your progress, and receive personalized AI coaching through chat. The Service is designed to support your personal growth and well-being.",
                "Mentiva es una aplicacion de coaching de bienestar impulsada por IA que te ayuda a crear y administrar tableros de vision, completar misiones diarias, escribir un diario de tu progreso y recibir coaching personalizado por IA a traves del chat. El Servicio esta disenado para apoyar tu crecimiento personal y bienestar."
              )}
            </p>
          </section>

          {/* 3. User Accounts */}
          <section>
            <h2
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontWeight: 500,
                fontSize: "1.25rem",
                color: "#2C3028",
                marginBottom: "0.75rem",
              }}
            >
              {t("3. User Accounts", "3. Cuentas de Usuario")}
            </h2>
            <p style={{ color: "#5A6352", fontSize: "0.9rem", lineHeight: 1.7 }}>
              {t(
                "You must sign in using Google OAuth to access the Service. You are responsible for maintaining the security of your Google account. You must provide accurate information and keep your account details up to date. You may not share your account or allow others to access the Service through your credentials.",
                "Debes iniciar sesion usando Google OAuth para acceder al Servicio. Eres responsable de mantener la seguridad de tu cuenta de Google. Debes proporcionar informacion precisa y mantener los datos de tu cuenta actualizados. No puedes compartir tu cuenta ni permitir que otros accedan al Servicio a traves de tus credenciales."
              )}
            </p>
          </section>

          {/* 4. User Content */}
          <section>
            <h2
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontWeight: 500,
                fontSize: "1.25rem",
                color: "#2C3028",
                marginBottom: "0.75rem",
              }}
            >
              {t("4. User Content", "4. Contenido del Usuario")}
            </h2>
            <p style={{ color: "#5A6352", fontSize: "0.9rem", lineHeight: 1.7 }}>
              {t(
                "You retain ownership of all content you create or upload, including vision board images, journal entries, and chat messages. By using the Service, you grant Mentiva a limited license to store, process, and display your content solely to provide and improve the Service. We will not sell your content or share it with third parties for advertising purposes.",
                "Conservas la propiedad de todo el contenido que creas o subes, incluyendo imagenes del tablero de vision, entradas de diario y mensajes de chat. Al usar el Servicio, otorgas a Mentiva una licencia limitada para almacenar, procesar y mostrar tu contenido unicamente para proporcionar y mejorar el Servicio. No venderemos tu contenido ni lo compartiremos con terceros con fines publicitarios."
              )}
            </p>
          </section>

          {/* 5. AI-Generated Content */}
          <section>
            <h2
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontWeight: 500,
                fontSize: "1.25rem",
                color: "#2C3028",
                marginBottom: "0.75rem",
              }}
            >
              {t(
                "5. AI-Generated Content Disclaimer",
                "5. Aviso sobre Contenido Generado por IA"
              )}
            </h2>
            <p style={{ color: "#5A6352", fontSize: "0.9rem", lineHeight: 1.7 }}>
              {t(
                "Mentiva uses artificial intelligence to provide coaching, suggestions, and personalized content. This AI-generated content is for informational and motivational purposes only. It does not constitute professional medical, psychological, financial, or legal advice. Always consult qualified professionals for specific health, mental health, or financial concerns. Mentiva is not a substitute for professional care.",
                "Mentiva utiliza inteligencia artificial para proporcionar coaching, sugerencias y contenido personalizado. Este contenido generado por IA es solo para fines informativos y motivacionales. No constituye asesoramiento medico, psicologico, financiero o legal profesional. Siempre consulta a profesionales calificados para problemas especificos de salud, salud mental o finanzas. Mentiva no es un sustituto de la atencion profesional."
              )}
            </p>
          </section>

          {/* 6. Payment Terms */}
          <section>
            <h2
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontWeight: 500,
                fontSize: "1.25rem",
                color: "#2C3028",
                marginBottom: "0.75rem",
              }}
            >
              {t("6. Payment Terms", "6. Terminos de Pago")}
            </h2>
            <p style={{ color: "#5A6352", fontSize: "0.9rem", lineHeight: 1.7 }}>
              {t(
                "Mentiva offers a Founding Member plan at a one-time payment of $10 USD, processed through Stripe. This founding rate is available for a limited number of early members and grants lifetime access at the founding price. Payments are non-refundable except as required by applicable law. We reserve the right to change pricing for future members. Stripe handles all payment processing, and we do not store your credit card information.",
                "Mentiva ofrece un plan de Miembro Fundador con un pago unico de $10 USD, procesado a traves de Stripe. Esta tarifa fundadora esta disponible para un numero limitado de miembros tempranos y otorga acceso de por vida al precio fundador. Los pagos no son reembolsables excepto cuando lo requiera la ley aplicable. Nos reservamos el derecho de cambiar los precios para futuros miembros. Stripe maneja todo el procesamiento de pagos y no almacenamos la informacion de tu tarjeta de credito."
              )}
            </p>
          </section>

          {/* 7. Intellectual Property */}
          <section>
            <h2
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontWeight: 500,
                fontSize: "1.25rem",
                color: "#2C3028",
                marginBottom: "0.75rem",
              }}
            >
              {t("7. Intellectual Property", "7. Propiedad Intelectual")}
            </h2>
            <p style={{ color: "#5A6352", fontSize: "0.9rem", lineHeight: 1.7 }}>
              {t(
                "The Service, including its design, code, branding, and AI models, is owned by Mentiva and protected by intellectual property laws. You may not copy, modify, distribute, or reverse-engineer any part of the Service. Your use of the Service does not grant you any ownership rights in the platform or its technology.",
                "El Servicio, incluyendo su diseno, codigo, marca e modelos de IA, es propiedad de Mentiva y esta protegido por leyes de propiedad intelectual. No puedes copiar, modificar, distribuir o aplicar ingenieria inversa a ninguna parte del Servicio. Tu uso del Servicio no te otorga ningun derecho de propiedad sobre la plataforma o su tecnologia."
              )}
            </p>
          </section>

          {/* 8. Limitation of Liability */}
          <section>
            <h2
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontWeight: 500,
                fontSize: "1.25rem",
                color: "#2C3028",
                marginBottom: "0.75rem",
              }}
            >
              {t("8. Limitation of Liability", "8. Limitacion de Responsabilidad")}
            </h2>
            <p style={{ color: "#5A6352", fontSize: "0.9rem", lineHeight: 1.7 }}>
              {t(
                "To the maximum extent permitted by law, Mentiva shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. Our total liability for any claims related to the Service is limited to the amount you paid for your membership. The Service is provided \"as is\" without warranties of any kind, express or implied.",
                "En la maxima medida permitida por la ley, Mentiva no sera responsable de ningun dano indirecto, incidental, especial, consecuente o punitivo que surja de tu uso del Servicio. Nuestra responsabilidad total por cualquier reclamo relacionado con el Servicio esta limitada al monto que pagaste por tu membresia. El Servicio se proporciona \"tal cual\" sin garantias de ningun tipo, expresas o implicitas."
              )}
            </p>
          </section>

          {/* 9. Termination */}
          <section>
            <h2
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontWeight: 500,
                fontSize: "1.25rem",
                color: "#2C3028",
                marginBottom: "0.75rem",
              }}
            >
              {t("9. Termination", "9. Terminacion")}
            </h2>
            <p style={{ color: "#5A6352", fontSize: "0.9rem", lineHeight: 1.7 }}>
              {t(
                "You may stop using the Service at any time. We may suspend or terminate your account if you violate these Terms or engage in conduct that harms other users or the integrity of the Service. Upon termination, your right to use the Service will cease, but you may request a copy of your data by contacting us.",
                "Puedes dejar de usar el Servicio en cualquier momento. Podemos suspender o cancelar tu cuenta si violas estos Terminos o participas en conductas que perjudiquen a otros usuarios o la integridad del Servicio. Al terminar, tu derecho a usar el Servicio cesara, pero puedes solicitar una copia de tus datos contactandonos."
              )}
            </p>
          </section>

          {/* 10. Changes to Terms */}
          <section>
            <h2
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontWeight: 500,
                fontSize: "1.25rem",
                color: "#2C3028",
                marginBottom: "0.75rem",
              }}
            >
              {t("10. Changes to Terms", "10. Cambios a los Terminos")}
            </h2>
            <p style={{ color: "#5A6352", fontSize: "0.9rem", lineHeight: 1.7 }}>
              {t(
                "We may modify these Terms at any time. When we make significant changes, we will notify you through the Service or by email. Your continued use of the Service after changes take effect constitutes your acceptance of the revised Terms.",
                "Podemos modificar estos Terminos en cualquier momento. Cuando realicemos cambios significativos, te notificaremos a traves del Servicio o por correo electronico. Tu uso continuado del Servicio despues de que los cambios entren en vigor constituye tu aceptacion de los Terminos revisados."
              )}
            </p>
          </section>

          {/* 11. Contact */}
          <section>
            <h2
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontWeight: 500,
                fontSize: "1.25rem",
                color: "#2C3028",
                marginBottom: "0.75rem",
              }}
            >
              {t("11. Contact", "11. Contacto")}
            </h2>
            <p style={{ color: "#5A6352", fontSize: "0.9rem", lineHeight: 1.7 }}>
              {t(
                "If you have questions about these Terms, please contact us at:",
                "Si tienes preguntas sobre estos Terminos, contactanos en:"
              )}
            </p>
            <p
              style={{
                color: "#6B7E5C",
                fontSize: "0.9rem",
                fontWeight: 500,
                marginTop: "0.5rem",
              }}
            >
              support@mentiva.app
            </p>
          </section>
        </div>

        {/* Footer */}
        <footer
          style={{
            marginTop: "4rem",
            paddingTop: "2rem",
            borderTop: "1px solid rgba(44, 48, 40, 0.08)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <Link
            href="/privacy"
            style={{
              color: "#6B7E5C",
              fontSize: "0.85rem",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            {t("Privacy Policy", "Politica de Privacidad")}
          </Link>
          <p style={{ color: "#9DA894", fontSize: "0.8rem" }}>
            {String.fromCharCode(169)} 2026 Mentiva
          </p>
        </footer>
      </div>
    </div>
  );
}
