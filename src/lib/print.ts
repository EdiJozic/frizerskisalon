import type { Booking, Barber } from '@/types'
import { format } from 'date-fns'
import { hr } from 'date-fns/locale'

export function printSchedule(title: string, bookings: Booking[], barbers: Barber[]) {
  const barberName = (id: string) => barbers.find((b) => b.id === id)?.name ?? '—'

  const rows = [...bookings]
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .map(
      (b) => `
        <tr>
          <td>${format(new Date(b.start_time), 'HH:mm')}–${format(new Date(b.end_time), 'HH:mm')}</td>
          <td>${barberName(b.barber_id)}</td>
          <td>${escapeHtml(b.client_first_name)} ${escapeHtml(b.client_last_name)}</td>
          <td>${escapeHtml(b.client_phone)}</td>
          <td>${escapeHtml(b.service)}</td>
          <td>${escapeHtml(b.description ?? '')}</td>
        </tr>`
    )
    .join('')

  const html = `
    <!doctype html>
    <html lang="hr">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          body { font-family: -apple-system, Inter, sans-serif; padding: 24px; color: #1b1815; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          p.sub { color: #6b5f4e; margin-top: 0; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th, td { border: 1px solid #d3ccc2; padding: 8px 10px; text-align: left; }
          th { background: #f6f5f3; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p class="sub">Ispisano: ${format(new Date(), "d. MMMM yyyy. 'u' HH:mm", { locale: hr })}</p>
        <table>
          <thead>
            <tr><th>Vrijeme</th><th>Frizer</th><th>Klijent</th><th>Telefon</th><th>Usluga</th><th>Napomena</th></tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="6">Nema termina.</td></tr>'}</tbody>
        </table>
      </body>
    </html>`

  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  win.print()
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}
