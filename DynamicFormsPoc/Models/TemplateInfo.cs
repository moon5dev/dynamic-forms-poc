using System;

namespace DynamicFormsPoc.Models
{
    public class TemplateInfo
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Html { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public override string ToString()
        {
            return Name;
        }
    }
}
