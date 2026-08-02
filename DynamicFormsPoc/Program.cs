using System;
using System.IO;
using System.Windows.Forms;
using CefSharp;
using CefSharp.WinForms;

namespace DynamicFormsPoc
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            InitializeCefSharp();

            Application.Run(new Forms.MainForm());

            if (Cef.IsInitialized)
            {
                Cef.Shutdown();
            }
        }

        private static void InitializeCefSharp()
        {
            if (Cef.IsInitialized)
            {
                return;
            }

            var settings = new CefSettings();
            settings.CachePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Data", "CefCache");
            settings.CefCommandLineArgs.Add("disable-gpu", "1");
            settings.CefCommandLineArgs.Add("allow-file-access-from-files", "1");
            settings.CefCommandLineArgs.Add("disable-web-security", "1");

            Cef.Initialize(settings, true, (IBrowserProcessHandler)null);
        }
    }
}
