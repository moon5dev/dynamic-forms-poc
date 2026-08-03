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
                    Id = "sample-general-report",
                    Name = "샘플 - 기본 검사 리포트",
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now,
                    Html = SampleGeneralReportHtml()
                });

                Save(new TemplateInfo
                {
                    Id = "sample-measurement",
                    Name = "샘플 - 치수 측정 검사",
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now,
                    Html = SampleMeasurementHtml()
                });

                Save(new TemplateInfo
                {
                    Id = "sample-before-after",
                    Name = "샘플 - 전후 이미지 검사",
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now,
                    Html = SampleBeforeAfterHtml()
                });
            }

            File.WriteAllText(marker, DateTime.Now.ToString("s"));
        }

        private static string SampleInspectionHtml()
        {
            return "<h1 style=\"text-align:center\">검 사 성 적 서</h1>"
                + "<table><tbody>"
                + "<tr><th class=\"header-cell\">구분</th><td>" + SelectField("sample-use", "구분", "신규", "재검", "기타") + "</td><th class=\"header-cell\">관리 번호</th><td>" + TextField("sample-project", "관리 번호") + "</td></tr>"
                + "<tr><th class=\"header-cell\">제품명</th><td>" + TextField("sample-maker", "제품명") + "</td><th class=\"header-cell\">품목 코드</th><td>" + TextField("sample-part", "품목 코드") + "</td></tr>"
                + "<tr><th class=\"header-cell\">검사일자</th><td>" + TextField("sample-date", "검사일자") + "</td><th class=\"header-cell\">로트 번호</th><td>" + TextField("sample-serial", "로트 번호") + "</td></tr>"
                + "<tr><th class=\"header-cell\">검사원</th><td>" + TextField("sample-inspector", "검사원") + "</td><th class=\"header-cell\">문서 번호</th><td>" + TextField("sample-order", "문서 번호") + "</td></tr>"
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
            return "<h1>이미지 검사</h1>"
                + "<table><tbody>"
                + "<tr><th class=\"header-cell\">전체 사진(정면)</th><th class=\"header-cell\">전체 사진(후면)</th></tr>"
                + "<tr><td>" + ImageField("sample-img-1", "정면") + "</td><td>" + ImageField("sample-img-2", "후면") + "</td></tr>"
                + "<tr><th class=\"header-cell\">부분 사진</th><th class=\"header-cell\">부분 사진</th></tr>"
                + "<tr><td>" + ImageField("sample-img-3", "부분 1") + "</td><td>" + ImageField("sample-img-4", "부분 2") + "</td></tr>"
                + "</tbody></table>";
        }

        private static string SampleGeneralReportHtml()
        {
            return "<h1>기본 검사 리포트</h1>"
                + "<table><tbody>"
                + "<tr><th class=\"header-cell\">문서 번호</th><td>" + TextField("report-doc-no", "문서 번호") + "</td><th class=\"header-cell\">승인 내역</th><td>" + TextField("report-approval", "승인 내역") + "</td></tr>"
                + "<tr><th class=\"header-cell\">사용 구분</th><td colspan=\"3\">" + CheckField("report-new", "신규") + " " + CheckField("report-rework", "재작업") + " " + CheckField("report-etc", "기타") + "</td></tr>"
                + "<tr><th class=\"header-cell\">관리 번호</th><td>" + TextField("report-control-no", "관리 번호") + "</td><th class=\"header-cell\">품목 코드</th><td>" + TextField("report-item-code", "품목 코드") + "</td></tr>"
                + "<tr><th class=\"header-cell\">제품명</th><td>" + TextField("report-product", "제품명") + "</td><th class=\"header-cell\">로트 번호</th><td>" + TextField("report-lot", "로트 번호") + "</td></tr>"
                + "</tbody></table>"
                + "<h3>검사 결과 요약</h3>"
                + "<table><tbody>"
                + "<tr><th class=\"header-cell\">No.</th><th class=\"header-cell\">검사 항목</th><th class=\"header-cell\">판정</th><th class=\"header-cell\">비고</th></tr>"
                + "<tr><td>1</td><td>샘플 검사 항목</td><td>" + SelectField("report-result-1", "판정", "OK", "NG", "N/A") + "</td><td>" + TextField("report-note-1", "비고") + "</td></tr>"
                + "</tbody></table>";
        }

        private static string SampleMeasurementHtml()
        {
            return "<h1>치수 측정 검사</h1>"
                + "<table><tbody>"
                + "<tr><th class=\"header-cell\" colspan=\"8\">측정 위치 및 기준</th></tr>"
                + "<tr><td colspan=\"8\" style=\"height:210px\">측정 위치 도면 또는 설명 입력 영역</td></tr>"
                + "<tr><th class=\"header-cell\" colspan=\"4\">측정 그룹 A</th><th class=\"header-cell\" colspan=\"4\">측정 그룹 B</th></tr>"
                + "<tr><th>No.</th><th>1</th><th>2</th><th>3</th><th>No.</th><th>1</th><th>2</th><th>3</th></tr>"
                + "<tr><td>1</td><td>" + NumberField("measure-a1", "측정값") + "</td><td>" + NumberField("measure-a2", "측정값") + "</td><td>" + NumberField("measure-a3", "측정값") + "</td><td>1</td><td>" + NumberField("measure-b1", "측정값") + "</td><td>" + NumberField("measure-b2", "측정값") + "</td><td>" + NumberField("measure-b3", "측정값") + "</td></tr>"
                + "<tr><td>판정</td><td colspan=\"3\">" + SelectField("measure-result-a", "판정", "OK", "NG", "N/A") + "</td><td>판정</td><td colspan=\"3\">" + SelectField("measure-result-b", "판정", "OK", "NG", "N/A") + "</td></tr>"
                + "</tbody></table>";
        }

        private static string SampleBeforeAfterHtml()
        {
            return "<h1>전후 이미지 검사</h1>"
                + "<table><tbody>"
                + "<tr><th class=\"header-cell\" colspan=\"5\">전후 비교 이미지</th></tr>"
                + "<tr><td colspan=\"5\" style=\"height:180px\">검사 조건 및 특이사항 입력 영역</td></tr>"
                + "<tr><th class=\"header-cell\">구분</th><th class=\"header-cell\">1</th><th class=\"header-cell\">2</th><th class=\"header-cell\">3</th><th class=\"header-cell\">4</th></tr>"
                + "<tr><td>검사 전</td><td>" + ImageField("before-after-before-1", "검사 전 1") + "</td><td>" + ImageField("before-after-before-2", "검사 전 2") + "</td><td>" + ImageField("before-after-before-3", "검사 전 3") + "</td><td>" + ImageField("before-after-before-4", "검사 전 4") + "</td></tr>"
                + "<tr><td>검사 후</td><td>" + ImageField("before-after-after-1", "검사 후 1") + "</td><td>" + ImageField("before-after-after-2", "검사 후 2") + "</td><td>" + ImageField("before-after-after-3", "검사 후 3") + "</td><td>" + ImageField("before-after-after-4", "검사 후 4") + "</td></tr>"
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
