"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/language";

export default function PrivacyPage() {
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
            {t("Privacy Policy", "Politica de Privacidad")}
          </h1>
          <p style={{ color: "#5A6352", fontSize: "0.9rem" }}>
            {t("Effective date: March 2026", "Fecha de vigencia: marzo 2026")}
          </p>
        </header>

        {/* Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {/* 1. Introduction */}
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
              {t("1. Introduction", "1. Introduccion")}
            </h2>
            <p style={{ color: "#5A6352", fontSize: "0.9rem", lineHeight: 1.7 }}>
              {t(
                "Mentiva (\"we\", \"our\", \"us\") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your personal information when you use our AI wellness coaching application (\"the Service\").",
                "Mentiva (\"nosotros\", \"nuestro\") esta comprometido con la proteccion de tu privacidad. Esta Politica de Privacidad explica como recopilamos, usamos y protegemos tu informacion personal cuando usas nuestra aplicacion de coaching de bienestar con IA (\"el Servicio\")."
              )}
            </p>
          </section>

          {/* 2. What Data We Collect */}
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
              {t("2. What Data We Collect", "2. Que Datos Recopilamos")}
            </h2>
            <p
              style={{
                color: "#5A6352",
                fontSize: "0.9rem",
                lineHeight: 1.7,
                marginBottom: "0.75rem",
              }}
            >
              {t(
                "We collect the following types of information:",
                "Recopilamos los siguientes tipos de informacion:"
              )}
            </p>
            <ul
              style={{
                color: "#5A6352",
                fontSize: "0.9rem",
                lineHeight: 1.9,
                paddingLeft: "1.25rem",
                margin: 0,
              }}
            >
              <li>
                <strong style={{ color: "#2C3028" }}>
                  {t("Account information:", "Informacion de cuenta:")}
                </strong>{" "}
                {t(
                  "Email address and profile data from Google OAuth (name, profile picture).",
                  "Direccion de correo electronico y datos de perfil de Google OAuth (nombre, foto de perfil)."
                )}
              </li>
              <li>
                <strong style={{ color: "#2C3028" }}>
                  {t("Vision board content:", "Contenido del tablero de vision:")}
                </strong>{" "}
                {t(
                  "Images you upload to create your vision boards.",
                  "Imagenes que subes para crear tus tableros de vision."
                )}
              </li>
              <li>
                <strong style={{ color: "#2C3028" }}>
                  {t("Journal entries:", "Entradas de diario:")}
                </strong>{" "}
                {t(
                  "Text and reflections you write in your journal.",
                  "Textos y reflexiones que escribes en tu diario."
                )}
              </li>
              <li>
                <strong style={{ color: "#2C3028" }}>
                  {t("Chat messages:", "Mensajes de chat:")}
                </strong>{" "}
                {t(
                  "Conversations with the AI coaching assistant.",
                  "Conversaciones con el asistente de coaching con IA."
                )}
              </li>
              <li>
                <strong style={{ color: "#2C3028" }}>
                  {t("Usage data:", "Datos de uso:")}
                </strong>{" "}
                {t(
                  "How you interact with the app, including features used, session duration, and mission completions.",
                  "Como interactuas con la app, incluyendo funciones utilizadas, duracion de sesiones y misiones completadas."
                )}
              </li>
            </ul>
          </section>

          {/* 3. How We Use Your Data */}
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
              {t("3. How We Use Your Data", "3. Como Usamos tus Datos")}
            </h2>
            <ul
              style={{
                color: "#5A6352",
                fontSize: "0.9rem",
                lineHeight: 1.9,
                paddingLeft: "1.25rem",
                margin: 0,
              }}
            >
              <li>
                {t(
                  "To provide and maintain the Service, including AI coaching and personalized missions.",
                  "Para proporcionar y mantener el Servicio, incluyendo coaching con IA y misiones personalizadas."
                )}
              </li>
              <li>
                {t(
                  "To personalize your experience based on your vision boards, journal entries, and preferences.",
                  "Para personalizar tu experiencia basandose en tus tableros de vision, entradas de diario y preferencias."
                )}
              </li>
              <li>
                {t(
                  "To improve and develop new features for the app.",
                  "Para mejorar y desarrollar nuevas funciones para la app."
                )}
              </li>
              <li>
                {t(
                  "To communicate with you about your account and service updates.",
                  "Para comunicarnos contigo sobre tu cuenta y actualizaciones del servicio."
                )}
              </li>
            </ul>
          </section>

          {/* 4. Third-Party Services */}
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
              {t("4. Third-Party Services", "4. Servicios de Terceros")}
            </h2>
            <p
              style={{
                color: "#5A6352",
                fontSize: "0.9rem",
                lineHeight: 1.7,
                marginBottom: "0.75rem",
              }}
            >
              {t(
                "We use the following third-party services to operate the platform:",
                "Usamos los siguientes servicios de terceros para operar la plataforma:"
              )}
            </p>
            <ul
              style={{
                color: "#5A6352",
                fontSize: "0.9rem",
                lineHeight: 1.9,
                paddingLeft: "1.25rem",
                margin: 0,
              }}
            >
              <li>
                <strong style={{ color: "#2C3028" }}>Supabase:</strong>{" "}
                {t(
                  "Database hosting, authentication, and file storage.",
                  "Alojamiento de base de datos, autenticacion y almacenamiento de archivos."
                )}
              </li>
              <li>
                <strong style={{ color: "#2C3028" }}>Anthropic (Claude):</strong>{" "}
                {t(
                  "AI processing for coaching conversations, mission generation, and personalized insights.",
                  "Procesamiento de IA para conversaciones de coaching, generacion de misiones e insights personalizados."
                )}
              </li>
              <li>
                <strong style={{ color: "#2C3028" }}>Stripe:</strong>{" "}
                {t(
                  "Secure payment processing. We do not store your credit card details.",
                  "Procesamiento seguro de pagos. No almacenamos los datos de tu tarjeta de credito."
                )}
              </li>
              <li>
                <strong style={{ color: "#2C3028" }}>Google OAuth:</strong>{" "}
                {t(
                  "Authentication and sign-in. We only receive your email, name, and profile picture.",
                  "Autenticacion e inicio de sesion. Solo recibimos tu correo electronico, nombre y foto de perfil."
                )}
              </li>
            </ul>
          </section>

          {/* 5. Data Storage and Security */}
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
              {t("5. Data Storage and Security", "5. Almacenamiento y Seguridad de Datos")}
            </h2>
            <p style={{ color: "#5A6352", fontSize: "0.9rem", lineHeight: 1.7 }}>
              {t(
                "Your data is stored securely on Supabase-hosted infrastructure with encryption at rest and in transit. We implement industry-standard security measures to protect your information. However, no method of electronic storage is 100% secure, and we cannot guarantee absolute security.",
                "Tus datos se almacenan de forma segura en la infraestructura alojada en Supabase con encriptacion en reposo y en transito. Implementamos medidas de seguridad estandar de la industria para proteger tu informacion. Sin embargo, ningun metodo de almacenamiento electronico es 100% seguro, y no podemos garantizar seguridad absoluta."
              )}
            </p>
          </section>

          {/* 6. Your Rights */}
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
              {t("6. Your Rights", "6. Tus Derechos")}
            </h2>
            <p
              style={{
                color: "#5A6352",
                fontSize: "0.9rem",
                lineHeight: 1.7,
                marginBottom: "0.75rem",
              }}
            >
              {t("You have the right to:", "Tienes derecho a:")}
            </p>
            <ul
              style={{
                color: "#5A6352",
                fontSize: "0.9rem",
                lineHeight: 1.9,
                paddingLeft: "1.25rem",
                margin: 0,
              }}
            >
              <li>
                {t(
                  "Access your personal data and receive a copy of it.",
                  "Acceder a tus datos personales y recibir una copia de ellos."
                )}
              </li>
              <li>
                {t(
                  "Request deletion of your account and all associated data.",
                  "Solicitar la eliminacion de tu cuenta y todos los datos asociados."
                )}
              </li>
              <li>
                {t(
                  "Export your data in a standard format.",
                  "Exportar tus datos en un formato estandar."
                )}
              </li>
              <li>
                {t(
                  "Withdraw consent for data processing at any time.",
                  "Retirar el consentimiento para el procesamiento de datos en cualquier momento."
                )}
              </li>
            </ul>
            <p style={{ color: "#5A6352", fontSize: "0.9rem", lineHeight: 1.7, marginTop: "0.75rem" }}>
              {t(
                "To exercise any of these rights, contact us at:",
                "Para ejercer cualquiera de estos derechos, contactanos en:"
              )}
              <span style={{ color: "#6B7E5C", fontWeight: 500 }}> support@mentiva.app</span>
            </p>
          </section>

          {/* 7. Cookies */}
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
              {t("7. Cookies", "7. Cookies")}
            </h2>
            <p style={{ color: "#5A6352", fontSize: "0.9rem", lineHeight: 1.7 }}>
              {t(
                "We use minimal cookies, limited to authentication session cookies necessary for keeping you signed in. We do not use tracking cookies, advertising cookies, or third-party analytics cookies.",
                "Usamos cookies minimas, limitadas a cookies de sesion de autenticacion necesarias para mantenerte conectado. No usamos cookies de seguimiento, cookies de publicidad ni cookies de analitica de terceros."
              )}
            </p>
          </section>

          {/* 8. Children's Privacy */}
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
              {t("8. Children's Privacy", "8. Privacidad de Menores")}
            </h2>
            <p style={{ color: "#5A6352", fontSize: "0.9rem", lineHeight: 1.7 }}>
              {t(
                "Mentiva is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If we discover that we have collected information from a child under 13, we will promptly delete that data. If you believe a child under 13 has provided us with personal information, please contact us at support@mentiva.app.",
                "Mentiva no esta disenado para menores de 13 anos. No recopilamos intencionalmente informacion personal de menores de 13 anos. Si descubrimos que hemos recopilado informacion de un menor de 13 anos, eliminaremos esos datos de inmediato. Si crees que un menor de 13 anos nos ha proporcionado informacion personal, contactanos en support@mentiva.app."
              )}
            </p>
          </section>

          {/* 9. Changes to This Policy */}
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
              {t("9. Changes to This Policy", "9. Cambios a esta Politica")}
            </h2>
            <p style={{ color: "#5A6352", fontSize: "0.9rem", lineHeight: 1.7 }}>
              {t(
                "We may update this Privacy Policy from time to time. When we make significant changes, we will notify you through the Service or by email. The updated policy will be effective as of the date posted. We encourage you to review this policy periodically.",
                "Podemos actualizar esta Politica de Privacidad de vez en cuando. Cuando realicemos cambios significativos, te notificaremos a traves del Servicio o por correo electronico. La politica actualizada sera efectiva a partir de la fecha de publicacion. Te recomendamos revisar esta politica periodicamente."
              )}
            </p>
          </section>

          {/* 10. Contact */}
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
              {t("10. Contact", "10. Contacto")}
            </h2>
            <p style={{ color: "#5A6352", fontSize: "0.9rem", lineHeight: 1.7 }}>
              {t(
                "If you have questions or concerns about this Privacy Policy or how we handle your data, please contact us at:",
                "Si tienes preguntas o inquietudes sobre esta Politica de Privacidad o como manejamos tus datos, contactanos en:"
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
            href="/terms"
            style={{
              color: "#6B7E5C",
              fontSize: "0.85rem",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            {t("Terms of Service", "Terminos de Servicio")}
          </Link>
          <p style={{ color: "#9DA894", fontSize: "0.8rem" }}>
            {String.fromCharCode(169)} 2026 Mentiva
          </p>
        </footer>
      </div>
    </div>
  );
}
