using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Windows.Forms;
using CefSharp;
using CefSharp.WinForms;
using DynamicFormsPoc.Models;
using DynamicFormsPoc.Services;

namespace DynamicFormsPoc.Forms
{
    public class MainForm : Form
    {
        private readonly TemplateStore templateStore;
        private readonly TempImageService tempImageService;
        private readonly List<CompositionItem> compositionItems;

        private ChromiumWebBrowser browser;
        private EditorService editor;
        private ListBox templateListBox;
        private ListBox compositionListBox;
        private ToolStrip toolStrip;
        private StatusStrip statusStrip;
        private Panel browserPanel;
        private ToolStripStatusLabel modeStatusLabel;
        private ToolStripStatusLabel templateStatusLabel;
        private ToolStripStatusLabel saveStatusLabel;
        private ToolStripStatusLabel compositionStatusLabel;

        private TemplateInfo currentTemplate;
        private bool isFillMode;
        private bool isDirty;
        private bool editorReady;

        private ToolStripButton saveButton;

        public MainForm()
        {
            templateStore = new TemplateStore();
            tempImageService = new TempImageService();
            compositionItems = new List<CompositionItem>();

            Text = "Dynamic Forms PoC";
            Width = 1400;
            Height = 900;
            StartPosition = FormStartPosition.CenterScreen;

            BuildLayout();
            LoadEditor();
            RefreshTemplates();
            UpdateStatus();
        }

        protected override void OnFormClosed(FormClosedEventArgs e)
        {
            tempImageService.Cleanup();
            base.OnFormClosed(e);
        }

        private void BuildLayout()
        {
            toolStrip = new ToolStrip();
            toolStrip.GripStyle = ToolStripGripStyle.Hidden;
            toolStrip.Dock = DockStyle.Top;
            Controls.Add(toolStrip);

            AddButton("새 템플릿", NewTemplateClick);
            saveButton = AddButton("저장", SaveClick);
            AddButton("다른 이름으로 저장", SaveAsClick);
            AddButton("삭제", DeleteClick);
            AddButton("새로고침", RefreshClick);
            toolStrip.Items.Add(new ToolStripSeparator());

            AddButton("관리자 모드", DesignModeClick);
            AddButton("사용자 모드", FillModeClick);
            AddButton("입력값 초기화", ResetValuesClick);
            toolStrip.Items.Add(new ToolStripSeparator());

            AddButton("합본에 추가", AddToCompositionClick);
            AddButton("합본에서 제거", RemoveFromCompositionClick);
            AddButton("위로", MoveCompositionUpClick);
            AddButton("아래로", MoveCompositionDownClick);
            AddButton("합본 미리보기", PreviewClick);
            AddButton("인쇄", PrintClick);

            var mainSplit = new SplitContainer();
            mainSplit.Dock = DockStyle.Fill;
            mainSplit.FixedPanel = FixedPanel.Panel1;
            mainSplit.SplitterDistance = 220;
            Controls.Add(mainSplit);
            mainSplit.BringToFront();

            templateListBox = new ListBox();
            templateListBox.Dock = DockStyle.Fill;
            templateListBox.SelectedIndexChanged += TemplateListBoxSelectedIndexChanged;
            mainSplit.Panel1.Controls.Add(templateListBox);

            var rightSplit = new SplitContainer();
            rightSplit.Dock = DockStyle.Fill;
            rightSplit.FixedPanel = FixedPanel.Panel2;
            rightSplit.SplitterDistance = 900;
            mainSplit.Panel2.Controls.Add(rightSplit);

            browserPanel = new Panel();
            browserPanel.Dock = DockStyle.Fill;
            browserPanel.BackColor = Color.DimGray;
            rightSplit.Panel1.Controls.Add(browserPanel);

            compositionListBox = new ListBox();
            compositionListBox.Dock = DockStyle.Fill;
            rightSplit.Panel2.Controls.Add(compositionListBox);

            statusStrip = new StatusStrip();
            modeStatusLabel = new ToolStripStatusLabel();
            templateStatusLabel = new ToolStripStatusLabel();
            saveStatusLabel = new ToolStripStatusLabel();
            compositionStatusLabel = new ToolStripStatusLabel();
            statusStrip.Items.Add(modeStatusLabel);
            statusStrip.Items.Add(new ToolStripStatusLabel(" | "));
            statusStrip.Items.Add(templateStatusLabel);
            statusStrip.Items.Add(new ToolStripStatusLabel(" | "));
            statusStrip.Items.Add(saveStatusLabel);
            statusStrip.Items.Add(new ToolStripStatusLabel(" | "));
            statusStrip.Items.Add(compositionStatusLabel);
            Controls.Add(statusStrip);
            statusStrip.BringToFront();
        }

        private void LoadEditor()
        {
            string editorPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Html", "editor.html");
            browser = new ChromiumWebBrowser(new Uri(editorPath).AbsoluteUri);
            browser.Dock = DockStyle.Fill;
            browser.JavascriptMessageReceived += BrowserJavascriptMessageReceived;
            browser.FrameLoadEnd += BrowserFrameLoadEnd;

            browserPanel.Controls.Add(browser);
            browser.BringToFront();
            editor = new EditorService(browser);
        }

        private ToolStripButton AddButton(string text, EventHandler handler)
        {
            var button = new ToolStripButton(text);
            button.Click += handler;
            toolStrip.Items.Add(button);
            return button;
        }

        private void BrowserFrameLoadEnd(object sender, FrameLoadEndEventArgs e)
        {
            if (!e.Frame.IsMain)
            {
                return;
            }

            BeginInvoke(new MethodInvoker(delegate
            {
                editorReady = true;
                RunEditor(editor.NewTemplate());
                UpdateStatus();
            }));
        }

        private void BrowserJavascriptMessageReceived(object sender, JavascriptMessageReceivedEventArgs e)
        {
            BeginInvoke(new MethodInvoker(delegate
            {
                HandleEditorMessage(e.Message == null ? string.Empty : e.Message.ToString());
            }));
        }

        private void HandleEditorMessage(string json)
        {
            try
            {
                EditorMessage message = JsonUtil.Deserialize<EditorMessage>(json);
                if (message == null)
                {
                    return;
                }

                if (message.Type == "editor-ready")
                {
                    editorReady = true;
                }
                else if (message.Type == "content-changed")
                {
                    if (!isFillMode)
                    {
                        SetDirty(true);
                    }
                }
                else if (message.Type == "choose-image")
                {
                    ChooseImage(message.FieldId);
                }
                else if (message.Type == "image-remove")
                {
                    RunEditor(editor.ClearImageSource(message.FieldId));
                }
                else if (message.Type == "error")
                {
                    MessageBox.Show(this, message.Message, "Editor Error", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                }
            }
            catch
            {
            }
        }

        private void ChooseImage(string fieldId)
        {
            using (var dialog = new OpenFileDialog())
            {
                dialog.Title = "이미지 선택";
                dialog.Filter = "Image Files|*.png;*.jpg;*.jpeg;*.bmp;*.gif|All Files|*.*";
                if (dialog.ShowDialog(this) == DialogResult.OK)
                {
                    string url = tempImageService.CopyToSession(dialog.FileName);
                    RunEditor(editor.SetImageSource(fieldId, url));
                }
            }
        }

        private void RefreshTemplates()
        {
            templateListBox.Items.Clear();
            List<TemplateInfo> templates = templateStore.LoadAll();
            for (int i = 0; i < templates.Count; i++)
            {
                templateListBox.Items.Add(templates[i]);
            }
        }

        private async void TemplateListBoxSelectedIndexChanged(object sender, EventArgs e)
        {
            TemplateInfo selected = templateListBox.SelectedItem as TemplateInfo;
            if (selected == null || !editorReady)
            {
                return;
            }

            currentTemplate = selected;
            isFillMode = false;
            await editor.SetTemplateHtml(selected.Html);
            await editor.SetMode("design");
            SetDirty(false);
            UpdateStatus();
        }

        private async void NewTemplateClick(object sender, EventArgs e)
        {
            if (!editorReady)
            {
                return;
            }

            currentTemplate = new TemplateInfo();
            currentTemplate.Id = Guid.NewGuid().ToString("N");
            currentTemplate.Name = "새 템플릿";
            currentTemplate.CreatedAt = DateTime.Now;
            currentTemplate.UpdatedAt = DateTime.Now;
            isFillMode = false;
            await editor.NewTemplate();
            await editor.SetMode("design");
            SetDirty(true);
            UpdateStatus();
        }

        private async void SaveClick(object sender, EventArgs e)
        {
            await SaveCurrent(false);
        }

        private async void SaveAsClick(object sender, EventArgs e)
        {
            await SaveCurrent(true);
        }

        private async System.Threading.Tasks.Task SaveCurrent(bool saveAs)
        {
            if (isFillMode)
            {
                MessageBox.Show(this, "입력 모드에서는 템플릿 원본을 저장하지 않습니다.", "저장 제한", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }

            if (currentTemplate == null)
            {
                currentTemplate = new TemplateInfo();
                currentTemplate.Id = Guid.NewGuid().ToString("N");
                currentTemplate.CreatedAt = DateTime.Now;
            }

            if (saveAs || string.IsNullOrEmpty(currentTemplate.Name) || currentTemplate.Name == "새 템플릿")
            {
                using (var dialog = new NameDialog("템플릿 이름", "템플릿 이름을 입력하세요.", currentTemplate.Name))
                {
                    if (dialog.ShowDialog(this) != DialogResult.OK || string.IsNullOrEmpty(dialog.Value))
                    {
                        return;
                    }

                    if (saveAs)
                    {
                        currentTemplate = new TemplateInfo
                        {
                            Id = Guid.NewGuid().ToString("N"),
                            CreatedAt = DateTime.Now,
                            Name = dialog.Value
                        };
                    }
                    else
                    {
                        currentTemplate.Name = dialog.Value;
                    }
                }
            }

            currentTemplate.Html = await editor.GetTemplateHtml();
            templateStore.Save(currentTemplate);
            RefreshTemplates();
            SelectTemplate(currentTemplate.Id);
            SetDirty(false);
            UpdateStatus();
        }

        private void DeleteClick(object sender, EventArgs e)
        {
            TemplateInfo selected = templateListBox.SelectedItem as TemplateInfo;
            if (selected == null)
            {
                return;
            }

            DialogResult result = MessageBox.Show(this, "선택한 템플릿을 삭제할까요?", "삭제", MessageBoxButtons.YesNo, MessageBoxIcon.Question);
            if (result != DialogResult.Yes)
            {
                return;
            }

            templateStore.Delete(selected);
            if (currentTemplate != null && currentTemplate.Id == selected.Id)
            {
                currentTemplate = null;
                RunEditor(editor.NewTemplate());
            }
            RefreshTemplates();
            SetDirty(false);
            UpdateStatus();
        }

        private void RefreshClick(object sender, EventArgs e)
        {
            RefreshTemplates();
            UpdateStatus();
        }

        private async void DesignModeClick(object sender, EventArgs e)
        {
            isFillMode = false;
            await editor.SetMode("design");
            UpdateStatus();
        }

        private async void FillModeClick(object sender, EventArgs e)
        {
            if (currentTemplate == null)
            {
                MessageBox.Show(this, "사용자 모드로 전환할 템플릿을 선택하거나 저장하세요.", "모드 전환", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }

            isFillMode = true;
            await editor.SetMode("fill");
            UpdateStatus();
        }

        private void ResetValuesClick(object sender, EventArgs e)
        {
            RunEditor(editor.ResetValues());
        }

        private async void AddToCompositionClick(object sender, EventArgs e)
        {
            if (currentTemplate == null)
            {
                TemplateInfo selected = templateListBox.SelectedItem as TemplateInfo;
                if (selected == null)
                {
                    return;
                }
                currentTemplate = selected;
            }

            string html = await editor.GetCurrentDocumentHtml();
            compositionItems.Add(new CompositionItem
            {
                TemplateId = currentTemplate.Id,
                TemplateName = currentTemplate.Name,
                Html = html
            });
            RefreshComposition();
        }

        private void RemoveFromCompositionClick(object sender, EventArgs e)
        {
            int index = compositionListBox.SelectedIndex;
            if (index < 0)
            {
                return;
            }
            compositionItems.RemoveAt(index);
            RefreshComposition();
        }

        private void MoveCompositionUpClick(object sender, EventArgs e)
        {
            int index = compositionListBox.SelectedIndex;
            if (index <= 0)
            {
                return;
            }
            CompositionItem item = compositionItems[index];
            compositionItems.RemoveAt(index);
            compositionItems.Insert(index - 1, item);
            RefreshComposition();
            compositionListBox.SelectedIndex = index - 1;
        }

        private void MoveCompositionDownClick(object sender, EventArgs e)
        {
            int index = compositionListBox.SelectedIndex;
            if (index < 0 || index >= compositionItems.Count - 1)
            {
                return;
            }
            CompositionItem item = compositionItems[index];
            compositionItems.RemoveAt(index);
            compositionItems.Insert(index + 1, item);
            RefreshComposition();
            compositionListBox.SelectedIndex = index + 1;
        }

        private void PreviewClick(object sender, EventArgs e)
        {
            if (compositionItems.Count == 0)
            {
                MessageBox.Show(this, "합본 목록에 템플릿을 추가하세요.", "합본", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }

            using (var form = new PreviewForm(new List<CompositionItem>(compositionItems)))
            {
                form.ShowDialog(this);
            }
        }

        private void PrintClick(object sender, EventArgs e)
        {
            PreviewClick(sender, e);
        }

        private void RefreshComposition()
        {
            compositionListBox.Items.Clear();
            for (int i = 0; i < compositionItems.Count; i++)
            {
                compositionListBox.Items.Add(compositionItems[i]);
            }
            UpdateStatus();
        }

        private void SelectTemplate(string id)
        {
            for (int i = 0; i < templateListBox.Items.Count; i++)
            {
                TemplateInfo template = templateListBox.Items[i] as TemplateInfo;
                if (template != null && template.Id == id)
                {
                    templateListBox.SelectedIndex = i;
                    return;
                }
            }
        }

        private void SetDirty(bool dirty)
        {
            isDirty = dirty;
            UpdateStatus();
        }

        private async void RunEditor(System.Threading.Tasks.Task task)
        {
            try
            {
                await task;
            }
            catch (Exception ex)
            {
                MessageBox.Show(this, ex.Message, "Editor", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void UpdateStatus()
        {
            modeStatusLabel.Text = "모드: " + (isFillMode ? "사용자" : "관리자");
            templateStatusLabel.Text = "템플릿: " + (currentTemplate == null ? "(없음)" : currentTemplate.Name);
            saveStatusLabel.Text = "저장 상태: " + (isDirty ? "변경됨" : "저장됨");
            compositionStatusLabel.Text = "합본: " + compositionItems.Count + "개";

            if (saveButton != null)
            {
                saveButton.Enabled = !isFillMode;
            }
        }
    }
}
