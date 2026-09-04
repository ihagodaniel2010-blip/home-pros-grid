<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" 
                xmlns:html="http://www.w3.org/TR/REC-html40"
                xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html lang="en">
      <head>
        <title>XML Sitemap | H &amp; A Construction LLC</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #f8fafc;
            color: #0f172a;
            margin: 0;
            padding: 0;
            line-height: 1.5;
          }
          .header {
            background: linear-gradient(135deg, #0b2a4a 0%, #0f172a 100%);
            color: #ffffff;
            padding: 2.5rem 1.5rem;
            text-align: center;
            border-bottom: 4px solid #0284c7;
          }
          .header h1 {
            margin: 0;
            font-size: 1.75rem;
            font-weight: 800;
            letter-spacing: -0.025em;
          }
          .header p {
            margin: 0.5rem 0 0 0;
            font-size: 0.95rem;
            color: #94a3b8;
          }
          .container {
            max-width: 900px;
            margin: 2rem auto;
            padding: 0 1rem;
          }
          .card {
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
            border: 1px solid #e2e8f0;
            overflow: hidden;
          }
          .card-header {
            padding: 1.25rem 1.5rem;
            background: #f1f5f9;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 0.5rem;
          }
          .card-title {
            font-size: 1.1rem;
            font-weight: 700;
            color: #0f172a;
            margin: 0;
          }
          .badge {
            background: #0284c7;
            color: #ffffff;
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.8rem;
            font-weight: 600;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
            font-size: 0.9rem;
          }
          th {
            background: #f8fafc;
            color: #475569;
            font-weight: 600;
            padding: 0.75rem 1.5rem;
            border-bottom: 1px solid #e2e8f0;
            text-transform: uppercase;
            font-size: 0.75rem;
            letter-spacing: 0.05em;
          }
          td {
            padding: 1rem 1.5rem;
            border-bottom: 1px solid #f1f5f9;
            word-break: break-word;
          }
          tr:last-child td {
            border-bottom: none;
          }
          tr:hover td {
            background: #f8fafc;
          }
          a {
            color: #0284c7;
            text-decoration: none;
            font-weight: 500;
          }
          a:hover {
            text-decoration: underline;
          }
          .footer {
            text-align: center;
            padding: 2rem 1rem;
            font-size: 0.85rem;
            color: #64748b;
          }
          @media (max-width: 640px) {
            .header { padding: 1.5rem 1rem; }
            .header h1 { font-size: 1.4rem; }
            th, td { padding: 0.75rem 1rem; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>H &amp; A Construction LLC</h1>
          <p>XML Sitemap — Official Search Engine Page Directory</p>
        </div>
        <div class="container">
          <div class="card">
            <div class="card-header">
              <h2 class="card-title">Indexed Site Pages</h2>
              <span class="badge"><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/> Total Pages</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>URL Location</th>
                  <th>Last Modified</th>
                </tr>
              </thead>
              <tbody>
                <xsl:for-each select="sitemap:urlset/sitemap:url">
                  <tr>
                    <td>
                      <a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a>
                    </td>
                    <td>
                      <xsl:value-of select="sitemap:lastmod"/>
                    </td>
                  </tr>
                </xsl:for-each>
              </tbody>
            </table>
          </div>
          <div class="footer">
            © 2026 H &amp; A Construction LLC — Southern Maine Residential Construction &amp; Remodeling
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
