using System;
using System.Drawing;
using System.Windows.Forms;

namespace DynamicFormsPoc.Forms
{
    public class FieldConfigDialog : Form
    {
        private readonly TextBox labelTextBox;
        private readonly TextBox optionsTextBox;

        public FieldConfigDialog(string title, bool showOptions)
        {
            Text = title;
            FormBorderStyle = FormBorderStyle.FixedDialog;
            StartPosition = FormStartPosition.CenterParent;
            MaximizeBox = false;
            MinimizeBox = false;
            ClientSize = new Size(400, showOptions ? 190 : 125);

            var label = new Label();
            label.Text = "필드명";
            label.Left = 12;
            label.Top = 15;
            label.Width = 360;
            Controls.Add(label);

            labelTextBox = new TextBox();
            labelTextBox.Left = 12;
            labelTextBox.Top = 40;
            labelTextBox.Width = 360;
            Controls.Add(labelTextBox);

            if (showOptions)
            {
                var optionsLabel = new Label();
                optionsLabel.Text = "콤보 옵션(쉼표 구분)";
                optionsLabel.Left = 12;
                optionsLabel.Top = 75;
                optionsLabel.Width = 360;
                Controls.Add(optionsLabel);

                optionsTextBox = new TextBox();
                optionsTextBox.Left = 12;
                optionsTextBox.Top = 100;
                optionsTextBox.Width = 360;
                optionsTextBox.Text = "OK,NG,N/A";
                Controls.Add(optionsTextBox);
            }

            var okButton = new Button();
            okButton.Text = "확인";
            okButton.DialogResult = DialogResult.OK;
            okButton.Left = 216;
            okButton.Top = showOptions ? 148 : 82;
            okButton.Width = 75;
            Controls.Add(okButton);

            var cancelButton = new Button();
            cancelButton.Text = "취소";
            cancelButton.DialogResult = DialogResult.Cancel;
            cancelButton.Left = 297;
            cancelButton.Top = showOptions ? 148 : 82;
            cancelButton.Width = 75;
            Controls.Add(cancelButton);

            AcceptButton = okButton;
            CancelButton = cancelButton;
        }

        public string FieldLabel
        {
            get { return string.IsNullOrEmpty(labelTextBox.Text.Trim()) ? "입력 필드" : labelTextBox.Text.Trim(); }
        }

        public string[] Options
        {
            get
            {
                if (optionsTextBox == null || string.IsNullOrEmpty(optionsTextBox.Text.Trim()))
                {
                    return new string[] { "OK", "NG", "N/A" };
                }

                return optionsTextBox.Text.Split(new char[] { ',' }, StringSplitOptions.RemoveEmptyEntries);
            }
        }
    }
}
