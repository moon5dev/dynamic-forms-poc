using System;
using System.Collections.Generic;
using System.IO;
using System.Windows.Forms;
using CefSharp;
using CefSharp.WinForms;
using DynamicFormsPoc.Models;
using DynamicFormsPoc.Services;

namespace DynamicFormsPoc.Forms
{
    public class PreviewForm : Form
    {
        private readonly ChromiumWebBrowser browser;
        private readonly List<CompositionItem> items;
        private bool rendered;

        public PreviewForm(List<CompositionItem> items)
        {
            this.items = items;
            Text = "합본 미리보기";
            Width = 1000;
            Height = 800;
            StartPosition = FormStartPosition.CenterParent;

            var toolStrip = new ToolStrip();
            var printButton = new ToolStripButton("인쇄");
            printButton.Click += PrintButtonClick;
            toolStrip.Items.Add(printButton);
            Controls.Add(toolStrip);

            string previewPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Html", "preview.html");
            browser = new ChromiumWebBrowser(new Uri(previewPath).AbsoluteUri);
            browser.Dock = DockStyle.Fill;
            browser.FrameLoadEnd += BrowserFrameLoadEnd;
            Controls.Add(browser);
            browser.BringToFront();
            toolStrip.BringToFront();
        }

        private void BrowserFrameLoadEnd(object sender, FrameLoadEndEventArgs e)
        {
            if (!e.Frame.IsMain || rendered)
            {
                return;
            }

            rendered = true;
            BeginInvoke(new MethodInvoker(delegate
            {
                string json = JsonUtil.Serialize(items);
                browser.EvaluateScriptAsync("preview.renderComposition(" + json + ")");
            }));
        }

        private void PrintButtonClick(object sender, EventArgs e)
        {
            browser.EvaluateScriptAsync("preview.printDocument()");
        }
    }
}
