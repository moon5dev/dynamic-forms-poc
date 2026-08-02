namespace DynamicFormsPoc.Models
{
    public class CompositionItem
    {
        public string TemplateId { get; set; }
        public string TemplateName { get; set; }
        public string Html { get; set; }

        public override string ToString()
        {
            return TemplateName;
        }
    }
}
