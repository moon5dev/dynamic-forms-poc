using System;
using System.IO;

namespace DynamicFormsPoc.Services
{
    public class TempImageService
    {
        private readonly string sessionFolder;

        public TempImageService()
        {
            sessionFolder = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Data", "Temp", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(sessionFolder);
        }

        public string SessionFolder
        {
            get { return sessionFolder; }
        }

        public string CopyToSession(string sourcePath)
        {
            string extension = Path.GetExtension(sourcePath);
            string fileName = Guid.NewGuid().ToString("N") + extension;
            string destination = Path.Combine(sessionFolder, fileName);
            File.Copy(sourcePath, destination, true);
            return new Uri(destination).AbsoluteUri;
        }

        public void Cleanup()
        {
            try
            {
                if (Directory.Exists(sessionFolder))
                {
                    Directory.Delete(sessionFolder, true);
                }
            }
            catch
            {
            }
        }
    }
}
