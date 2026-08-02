using System;
using System.Collections.Generic;
using System.IO;
using DynamicFormsPoc.Models;

namespace DynamicFormsPoc.Services
{
    public class TemplateStore
    {
        private readonly string templateFolder;

        public TemplateStore()
        {
            templateFolder = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Data", "Templates");
            Directory.CreateDirectory(templateFolder);
        }

        public string TemplateFolder
        {
            get { return templateFolder; }
        }

        public List<TemplateInfo> LoadAll()
        {
            EnsureSamples();

            var result = new List<TemplateInfo>();
            string[] files = Directory.GetFiles(templateFolder, "*.json");
            for (int i = 0; i < files.Length; i++)
            {
                try
                {
                    string json = File.ReadAllText(files[i]);
                    TemplateInfo template = JsonUtil.Deserialize<TemplateInfo>(json);
                    if (template != null && !string.IsNullOrEmpty(template.Id))
                    {
                        result.Add(template);
                    }
                }
                catch
                {
                }
            }

            result.Sort(delegate(TemplateInfo a, TemplateInfo b)
            {
                return string.Compare(a.Name, b.Name, StringComparison.CurrentCultureIgnoreCase);
            });

            return result;
        }

        public void Save(TemplateInfo template)
        {
            if (string.IsNullOrEmpty(template.Id))
            {
                template.Id = Guid.NewGuid().ToString("N");
            }

            if (template.CreatedAt == DateTime.MinValue)
            {
                template.CreatedAt = DateTime.Now;
            }

            template.UpdatedAt = DateTime.Now;

            string path = GetPath(template.Id);
            string json = JsonUtil.Serialize(template);
            File.WriteAllText(path, json);
        }

        public void Delete(TemplateInfo template)
        {
            if (template == null)
            {
                return;
            }

            string path = GetPath(template.Id);
            if (File.Exists(path))
            {
                File.Delete(path);
            }
        }

        private string GetPath(string id)
        {
            return Path.Combine(templateFolder, id + ".json");
        }

        private void EnsureSamples()
        {
            string marker = Path.Combine(templateFolder, ".samples-created");
            if (File.Exists(marker))
            {
                return;
            }

            if (Directory.GetFiles(templateFolder, "*.json").Length == 0)
            {
                Save(new TemplateInfo
                {
                    Id = "sample-inspection-result",
                    Name = "샘플 - 검사성적서",
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now,
                    Html = SampleInspectionHtml()
                });

                Save(new TemplateInfo
                {
                    Id = "sample-appearance",
                    Name = "샘플 - 외관 검사",
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now,
                    Html = SampleAppearanceHtml()
                });

                Save(new TemplateInfo
                {
                    Id = "sample-cc-tray",
                    Name = "샘플 - CC Tray Inspection Report",
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now,
                    Html = SampleCcTrayHtml()
                });

                Save(new TemplateInfo
                {
                    Id = "sample-flatness",
                    Name = "샘플 - 평면도 검사",
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now,
                    Html = SampleFlatnessHtml()
                });

                Save(new TemplateInfo
                {
                    Id = "sample-filter-treatment",
                    Name = "샘플 - Ceramic Filter Treatment Result",
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now,
                    Html = SampleFilterTreatmentHtml()
                });
            }

            File.WriteAllText(marker, DateTime.Now.ToString("s"));
        }

        private static string SampleInspectionHtml()
        {
            return "<h1 style=\"text-align:center\">검 사 성 적 서</h1>"
                + "<table><tbody>"
                + "<tr><th class=\"header-cell\">사용 구분</th><td>" + SelectField("sample-use", "사용 구분", "BRAND NEW", "REPAIR", "OTHERS") + "</td><th class=\"header-cell\">Project No.</th><td>" + TextField("sample-project", "Project No.") + "</td></tr>"
                + "<tr><th class=\"header-cell\">제조사명</th><td>" + TextField("sample-maker", "제조사명") + "</td><th class=\"header-cell\">Part Code</th><td>" + TextField("sample-part", "Part Code") + "</td></tr>"
                + "<tr><th class=\"header-cell\">검사일자</th><td>" + TextField("sample-date", "검사일자") + "</td><th class=\"header-cell\">Serial No.</th><td>" + TextField("sample-serial", "Serial No.") + "</td></tr>"
                + "<tr><th class=\"header-cell\">검사원</th><td>" + TextField("sample-inspector", "검사원") + "</td><th class=\"header-cell\">Order No.</th><td>" + TextField("sample-order", "Order No.") + "</td></tr>"
                + "</tbody></table>"
                + "<h3>검사 결과 요약</h3>"
                + "<table><tbody>"
                + "<tr><th class=\"header-cell\">No.</th><th class=\"header-cell\">Inspection Item</th><th class=\"header-cell\">Decision</th><th class=\"header-cell\">비고</th></tr>"
                + "<tr><td>1</td><td>" + TextField("sample-item-1", "검사항목") + "</td><td>" + SelectField("sample-result-1", "판정", "OK", "NG", "N/A") + "</td><td>" + TextField("sample-note-1", "비고") + "</td></tr>"
                + "<tr><td>2</td><td>" + TextField("sample-item-2", "검사항목") + "</td><td>" + SelectField("sample-result-2", "판정", "OK", "NG", "N/A") + "</td><td>" + TextField("sample-note-2", "비고") + "</td></tr>"
                + "</tbody></table>"
                + "<p><label class=\"field-label\"><input class=\"field-control\" data-field-id=\"sample-confirm\" data-field-type=\"checkbox\" data-field-label=\"최종 확인\" type=\"checkbox\" /> 최종 확인</label></p>";
        }

        private static string SampleAppearanceHtml()
        {
            return "<h1>외관 검사(코팅 전)</h1>"
                + "<table><tbody>"
                + "<tr><th class=\"header-cell\">전체 사진(정면)</th><th class=\"header-cell\">전체 사진(후면)</th></tr>"
                + "<tr><td>" + ImageField("sample-img-1", "정면") + "</td><td>" + ImageField("sample-img-2", "후면") + "</td></tr>"
                + "<tr><th class=\"header-cell\">부분 사진</th><th class=\"header-cell\">부분 사진</th></tr>"
                + "<tr><td>" + ImageField("sample-img-3", "부분 1") + "</td><td>" + ImageField("sample-img-4", "부분 2") + "</td></tr>"
                + "</tbody></table>";
        }

        private static string SampleCcTrayHtml()
        {
            return "<h1>CC Tray Inspection Report</h1>"
                + "<table><tbody>"
                + "<tr><th class=\"header-cell\">Document Number</th><td>" + TextField("cc-doc-no", "Document Number") + "</td><th class=\"header-cell\">승인도 / 승인도 승인내역</th><td>" + TextField("cc-approval", "승인내역") + "</td></tr>"
                + "<tr><th class=\"header-cell\">사용 구분</th><td colspan=\"3\">" + CheckField("cc-new", "BRAND NEW") + " " + CheckField("cc-repair", "REPAIR") + " " + CheckField("cc-others", "OTHERS") + "</td></tr>"
                + "<tr><th class=\"header-cell\">PROJECT NO.</th><td>" + TextField("cc-project", "PROJECT NO.") + "</td><th class=\"header-cell\">PART CODE</th><td>" + TextField("cc-part", "PART CODE") + "</td></tr>"
                + "<tr><th class=\"header-cell\">제조사명</th><td>" + TextField("cc-maker", "제조사명") + "</td><th class=\"header-cell\">Serial Number</th><td>" + TextField("cc-serial", "Serial Number") + "</td></tr>"
                + "</tbody></table>"
                + "<h3>검사 결과 요약</h3>"
                + "<table><tbody>"
                + "<tr><th class=\"header-cell\">No.</th><th class=\"header-cell\">검사 항목</th><th class=\"header-cell\">판정</th><th class=\"header-cell\">비고</th></tr>"
                + "<tr><td>1</td><td>외관사전 코팅 전</td><td>" + SelectField("cc-result-1", "판정", "OK", "NG", "N/A") + "</td><td>" + TextField("cc-note-1", "비고") + "</td></tr>"
                + "</tbody></table>";
        }

        private static string SampleFlatnessHtml()
        {
            return "<h1>평면도 검사</h1>"
                + "<table><tbody>"
                + "<tr><th class=\"header-cell\" colspan=\"8\">평면도 측정영역(Flatness Measurement Point)</th></tr>"
                + "<tr><td colspan=\"8\" style=\"height:210px\">측정 위치 도면 또는 설명 입력 영역</td></tr>"
                + "<tr><th class=\"header-cell\" colspan=\"4\">Coating 전</th><th class=\"header-cell\" colspan=\"4\">Coating 후</th></tr>"
                + "<tr><th>No.</th><th>1</th><th>2</th><th>3</th><th>No.</th><th>1</th><th>2</th><th>3</th></tr>"
                + "<tr><td>1</td><td>" + NumberField("flat-a1", "측정값") + "</td><td>" + NumberField("flat-a2", "측정값") + "</td><td>" + NumberField("flat-a3", "측정값") + "</td><td>1</td><td>" + NumberField("flat-b1", "측정값") + "</td><td>" + NumberField("flat-b2", "측정값") + "</td><td>" + NumberField("flat-b3", "측정값") + "</td></tr>"
                + "<tr><td>판정</td><td colspan=\"3\">" + SelectField("flat-result-a", "판정", "OK", "NG", "N/A") + "</td><td>판정</td><td colspan=\"3\">" + SelectField("flat-result-b", "판정", "OK", "NG", "N/A") + "</td></tr>"
                + "</tbody></table>";
        }

        private static string SampleFilterTreatmentHtml()
        {
            return "<h1>Ceramic Filter Treatment Result</h1>"
                + "<table><tbody>"
                + "<tr><th class=\"header-cell\" colspan=\"5\">Ceramic Filter Treatment Result</th></tr>"
                + "<tr><td colspan=\"5\" style=\"height:180px\">처리 조건 및 특이사항 입력 영역</td></tr>"
                + "<tr><th class=\"header-cell\">구분</th><th class=\"header-cell\">1</th><th class=\"header-cell\">2</th><th class=\"header-cell\">3</th><th class=\"header-cell\">4</th></tr>"
                + "<tr><td>처리 전</td><td>" + ImageField("filter-before-1", "처리 전 1") + "</td><td>" + ImageField("filter-before-2", "처리 전 2") + "</td><td>" + ImageField("filter-before-3", "처리 전 3") + "</td><td>" + ImageField("filter-before-4", "처리 전 4") + "</td></tr>"
                + "<tr><td>처리 후</td><td>" + ImageField("filter-after-1", "처리 후 1") + "</td><td>" + ImageField("filter-after-2", "처리 후 2") + "</td><td>" + ImageField("filter-after-3", "처리 후 3") + "</td><td>" + ImageField("filter-after-4", "처리 후 4") + "</td></tr>"
                + "</tbody></table>";
        }

        private static string ImageField(string id, string label)
        {
            return "<div class=\"image-field\" data-field-id=\"" + id + "\" data-field-type=\"image\" data-field-label=\"" + label + "\">"
                + "<div class=\"image-placeholder\">이미지 없음 - " + label + "</div>"
                + "<img class=\"image-preview\" alt=\"" + label + "\" />"
                + "<div class=\"image-actions\"><button type=\"button\" data-image-action=\"choose\">선택</button><button type=\"button\" data-image-action=\"remove\">삭제</button></div>"
                + "</div>";
        }

        private static string TextField(string id, string label)
        {
            return "<input class=\"field-control\" data-field-id=\"" + id + "\" data-field-type=\"text\" data-field-label=\"" + label + "\" type=\"text\" value=\"\" placeholder=\"" + label + "\" />";
        }

        private static string NumberField(string id, string label)
        {
            return "<input class=\"field-control\" data-field-id=\"" + id + "\" data-field-type=\"number\" data-field-label=\"" + label + "\" type=\"number\" value=\"\" placeholder=\"" + label + "\" />";
        }

        private static string SelectField(string id, string label, params string[] options)
        {
            string html = "<select class=\"field-control\" data-field-id=\"" + id + "\" data-field-type=\"select\" data-field-label=\"" + label + "\"><option value=\"\">선택</option>";
            for (int i = 0; i < options.Length; i++)
            {
                html += "<option>" + options[i] + "</option>";
            }
            return html + "</select>";
        }

        private static string CheckField(string id, string label)
        {
            return "<label class=\"field-label\"><input class=\"field-control\" data-field-id=\"" + id + "\" data-field-type=\"checkbox\" data-field-label=\"" + label + "\" type=\"checkbox\" /> " + label + "</label>";
        }
    }
}
