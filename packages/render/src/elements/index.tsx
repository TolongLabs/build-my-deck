import type { Element, TextElement, TextParagraph, TextRun, ThemeSpec } from '@build-my-deck/deck-schema'
import type { CSSProperties, ReactNode } from 'react'
import { resolveColorStyle, resolveTypeStyle } from '../theme-to-css'

type ElementContentProps = {
  element: Element
  theme: ThemeSpec
}

const isDecoration = (semanticRole: string) => semanticRole.toLowerCase() === 'decoration'

const headingLevel = (semanticRole: string) => {
  const role = semanticRole.toLowerCase()
  if (role === 'headline' || role === 'title') return 1
  if (role.includes('subheadline') || role.includes('section')) return 2
  if (role.includes('heading')) return 3
  return undefined
}

function TextRunView({ run }: { run: TextRun }) {
  let content: ReactNode = run.text
  for (const mark of run.marks) {
    if (mark === 'em') content = <em>{content}</em>
    if (mark === 'strong') content = <strong>{content}</strong>
    if (mark === 'code') content = <code>{content}</code>
  }
  return <>{content}</>
}

const runSignature = (run: TextRun) => `${run.text}:${run.marks.join(',')}`

function ParagraphContent({ paragraph }: { paragraph: TextParagraph }) {
  return (
    <>
      {paragraph.runs.map((run, index) => (
        <TextRunView
          key={`${runSignature(run)}:${paragraph.runs.slice(0, index).filter((previous) => runSignature(previous) === runSignature(run)).length}`}
          run={run}
        />
      ))}
    </>
  )
}

function TextView({ element, theme }: { element: TextElement; theme: ThemeSpec }) {
  const style = resolveTypeStyle(theme, element.style)
  const Heading =
    headingLevel(element.semanticRole) === 1 ? 'h1' : headingLevel(element.semanticRole) === 2 ? 'h2' : 'h3'
  const level = headingLevel(element.semanticRole)
  const paragraphs = element.content.paragraphs
  const contentStyle: CSSProperties = {
    color: style.color,
    fontFamily: style.fontFamily,
    fontSize: `${style.fontSize}px`,
    fontWeight: style.fontWeight,
    letterSpacing: `${style.letterSpacing}px`,
    lineHeight: style.lineHeight
  }

  return (
    <div className="bmd-text-content" style={contentStyle}>
      {paragraphs.map((paragraph, index) => {
        const content = <ParagraphContent paragraph={paragraph} />
        const signature = `${paragraph.listStyle ?? 'paragraph'}:${paragraph.runs.map(runSignature).join('|')}`
        const key = `${signature}:${
          paragraphs
            .slice(0, index)
            .filter(
              (previous) =>
                `${previous.listStyle ?? 'paragraph'}:${previous.runs.map(runSignature).join('|')}` === signature
            ).length
        }`
        if (paragraph.listStyle === 'bullet')
          return (
            <ul key={key}>
              <li>{content}</li>
            </ul>
          )
        if (paragraph.listStyle === 'ordered')
          return (
            <ol key={key}>
              <li>{content}</li>
            </ol>
          )
        if (index === 0 && level) return <Heading key={key}>{content}</Heading>
        return <p key={key}>{content}</p>
      })}
    </div>
  )
}

function CatalogIcon({ catalogRef }: { catalogRef: string }) {
  if (catalogRef === 'arrow-right') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M5 12h13M13 6l6 6-6 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="7" fill="currentColor" />
    </svg>
  )
}

function CatalogSvg({ assetId }: { assetId: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-asset-id={assetId}>
      <path d="M4 4h16v16H4z" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M7 15l3-3 2 2 3-4 2 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ElementContent({ element, theme }: ElementContentProps) {
  if (element.kind === 'text') return <TextView element={element} theme={theme} />
  const style = resolveColorStyle(theme, element.style)
  const colorStyle: CSSProperties = { backgroundColor: style.color, opacity: style.opacity }

  if (element.kind === 'image') {
    return (
      <img
        className="bmd-image"
        alt={element.semanticRole}
        data-asset-id={element.assetId}
        style={{ ...colorStyle, objectFit: 'cover' }}
      />
    )
  }
  if (element.kind === 'shape') {
    if (element.shape === 'line')
      return (
        <div className="bmd-shape bmd-shape-line" style={{ backgroundColor: style.color, opacity: style.opacity }} />
      )
    return <div className={`bmd-shape bmd-shape-${element.shape}`} style={colorStyle} />
  }
  if (element.kind === 'icon') {
    return (
      <span
        className="bmd-icon"
        data-catalog-ref={element.catalogRef}
        style={{ color: style.color, opacity: style.opacity }}
      >
        <CatalogIcon catalogRef={element.catalogRef} />
      </span>
    )
  }
  if (element.kind === 'svg') {
    return (
      <span className="bmd-svg" data-asset-id={element.assetId} style={{ color: style.color, opacity: style.opacity }}>
        <CatalogSvg assetId={element.assetId} />
      </span>
    )
  }
  if (element.kind === 'diagram') {
    return <div className="bmd-diagram" style={colorStyle} aria-label={element.semanticRole} />
  }
  return <div className="bmd-group" style={{ borderColor: style.color, opacity: style.opacity }} />
}

export const elementIsDecoration = isDecoration
