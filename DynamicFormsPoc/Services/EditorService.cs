using System;
using System.Text;
using System.Threading.Tasks;
using CefSharp;
using CefSharp.WinForms;

namespace DynamicFormsPoc.Services
{
    public class EditorService
    {
        private readonly ChromiumWebBrowser browser;

        public EditorService(ChromiumWebBrowser browser)
        {
            this.browser = browser;
        }

        public Task NewTemplate()
        {
            return Execute("editor.newTemplate");
        }

        public Task SetMode(string mode)
        {
            return Execute("editor.setMode", mode);
        }

        public Task ResetValues()
        {
            return Execute("editor.resetValues");
        }

        public Task SetTemplateHtml(string html)
        {
            return Execute("editor.setTemplateHtml", html);
        }

        public Task InsertTable(int rows, int columns)
        {
            return Execute("editor.insertTable", rows, columns);
        }

        public Task AddTableRow()
        {
            return Execute("editor.addTableRow");
        }

        public Task DeleteTableRow()
        {
            return Execute("editor.deleteTableRow");
        }

        public Task AddTableColumn()
        {
            return Execute("editor.addTableColumn");
        }

        public Task DeleteTableColumn()
        {
            return Execute("editor.deleteTableColumn");
        }

        public Task InsertTextField(object config)
        {
            return Execute("editor.insertTextField", config);
        }

        public Task InsertNumberField(object config)
        {
            return Execute("editor.insertNumberField", config);
        }

        public Task InsertSelectField(object config)
        {
            return Execute("editor.insertSelectField", config);
        }

        public Task InsertCheckboxField(object config)
        {
            return Execute("editor.insertCheckboxField", config);
        }

        public Task InsertImageField(object config)
        {
            return Execute("editor.insertImageField", config);
        }

        public Task SetImageSource(string fieldId, string imageUrl)
        {
            return Execute("editor.setImageSource", fieldId, imageUrl);
        }

        public Task ClearImageSource(string fieldId)
        {
            return Execute("editor.clearImageSource", fieldId);
        }

        public async Task<string> GetTemplateHtml()
        {
            return await EvaluateString("editor.getTemplateHtml()");
        }

        public async Task<string> GetCurrentDocumentHtml()
        {
            return await EvaluateString("editor.getCurrentDocumentHtml()");
        }

        public async Task<bool> IsReady()
        {
            var response = await browser.EvaluateScriptAsync("window.editor && editor.isReady === true");
            return response.Success && response.Result != null && response.Result is bool && (bool)response.Result;
        }

        public async Task Execute(string functionName, params object[] args)
        {
            string script = BuildCall(functionName, args);
            var response = await browser.EvaluateScriptAsync(script);
            if (!response.Success)
            {
                throw new InvalidOperationException(response.Message);
            }
        }

        private async Task<string> EvaluateString(string script)
        {
            var response = await browser.EvaluateScriptAsync(script);
            if (!response.Success)
            {
                throw new InvalidOperationException(response.Message);
            }

            if (response.Result == null)
            {
                return string.Empty;
            }

            return response.Result.ToString();
        }

        private static string BuildCall(string functionName, object[] args)
        {
            var builder = new StringBuilder();
            builder.Append(functionName);
            builder.Append("(");

            for (int i = 0; i < args.Length; i++)
            {
                if (i > 0)
                {
                    builder.Append(",");
                }

                builder.Append(JsonUtil.Serialize(args[i]));
            }

            builder.Append(")");
            return builder.ToString();
        }
    }
}
