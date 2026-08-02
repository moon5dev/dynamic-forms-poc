using System;
using System.Drawing;
using System.Windows.Forms;

namespace DynamicFormsPoc.Forms
{
    public class NameDialog : Form
    {
        private readonly TextBox textBox;

        public NameDialog(string title, string label, string initialValue)
        {
            Text = title;
            FormBorderStyle = FormBorderStyle.FixedDialog;
            StartPosition = FormStartPosition.CenterParent;
            MaximizeBox = false;
            MinimizeBox = false;
            ClientSize = new Size(360, 120);

            var labelControl = new Label();
            labelControl.Text = label;
            labelControl.Left = 12;
            labelControl.Top = 15;
            labelControl.Width = 330;
            Controls.Add(labelControl);

            textBox = new TextBox();
            textBox.Left = 12;
            textBox.Top = 40;
            textBox.Width = 330;
            textBox.Text = initialValue;
            Controls.Add(textBox);

            var okButton = new Button();
            okButton.Text = "확인";
            okButton.DialogResult = DialogResult.OK;
            okButton.Left = 186;
            okButton.Top = 78;
            okButton.Width = 75;
            Controls.Add(okButton);

            var cancelButton = new Button();
            cancelButton.Text = "취소";
            cancelButton.DialogResult = DialogResult.Cancel;
            cancelButton.Left = 267;
            cancelButton.Top = 78;
            cancelButton.Width = 75;
            Controls.Add(cancelButton);

            AcceptButton = okButton;
            CancelButton = cancelButton;
        }

        public string Value
        {
            get { return textBox.Text.Trim(); }
        }

        protected override void OnShown(EventArgs e)
        {
            base.OnShown(e);
            textBox.Focus();
            textBox.SelectAll();
        }
    }
}
