# Dynamic Forms PoC

.NET Framework 4.5.2 WinForms + CefSharp + 로컬 HTML/CSS/JavaScript로 동적 검사 성적서 양식을 검증하는 데스크톱 PoC입니다.

## 목표

- 관리자가 검사 성적서 템플릿을 WYSIWYG 방식으로 작성하고 JSON 파일로 저장합니다.
- 사용자 모드에서는 표 구조, 행/열, 고정 문구를 수정하지 못하고 입력 필드와 이미지 필드만 조작합니다.
- 사용자 모드에서도 입력 필드에 한해 글꼴, 크기, 굵게, 기울임, 밑줄, 정렬, 글자색을 조정할 수 있습니다.
- 여러 템플릿을 합본 미리보기하고 A4 페이지 단위로 출력합니다.
- 실제 결재 시스템은 구현하지 않고 `관리자 모드 / 사용자 모드` 전환으로 결재 전후 화면 흐름을 데모합니다.

## 기술 선택

- C#
- WinForms
- .NET Framework 4.5.2
- Visual Studio 2017 구형 `.sln/.csproj`
- CefSharp.WinForms `107.1.120`
- 로컬 Summernote WYSIWYG + 로컬 `Html/editor.html`, `editor.css`, `editor.js`, `preview.html`
- JSON 파일 저장
- 데이터베이스 없음

## CefSharp 버전

사용 버전은 `CefSharp.WinForms 107.1.120`입니다.

선택 이유:

- NuGet Gallery 기준 `CefSharp.WinForms 107.1.120`은 `.NET Framework 4.5.2`를 직접 타깃합니다.
- 같은 버전의 `CefSharp.Common 107.1.120`이 `cef.redist.x64/x86 107.1.12`에 의존합니다.
- 115 이상 계열은 WinForms/WPF/OffScreen의 .NET Framework 요구사항이 4.6.2 이상으로 올라가므로 이번 요구사항과 맞지 않습니다.

## WYSIWYG v1

회사망 보안 정책과 오프라인 데모를 고려해 Summernote와 jQuery를 프로젝트 내부 로컬 파일로 포함합니다.

포함 파일:

- `Html/vendor/jquery/jquery.min.js`
- `Html/vendor/summernote/summernote-lite.min.css`
- `Html/vendor/summernote/summernote-lite.min.js`
- `Html/vendor/summernote/font/*`

각 vendor 폴더에 라이선스 파일을 같이 포함했습니다. 로컬 파일 로딩에 실패하면 `editor.js`가 기본 `contenteditable` 모드로 폴백합니다.

WinForms 상단 툴바는 템플릿 저장/삭제, 관리자/사용자 모드, 합본, 미리보기, 인쇄 같은 앱 단위 명령만 담당합니다. 표 편집, 글꼴, 정렬, 입력 필드 삽입은 Summernote 에디터 내부 툴바에서 처리합니다.

관리자 모드에서 가능한 기능:

- 제목/문단 형식 변경
- 글꼴, 글자 크기, 글자색 변경
- 굵게, 기울임, 밑줄
- 왼쪽/가운데/오른쪽 정렬
- 행/열 개수를 입력해 표 삽입
- 행/열 추가 및 삭제
- 셀 병합 및 분할
- 헤더 셀 스타일 토글
- 셀 너비/높이 지정
- 텍스트, 숫자, 콤보, 체크박스, 이미지 영역 삽입

사용자 모드에서 가능한 기능:

- 텍스트/숫자 입력
- 콤보 선택
- 체크박스 선택
- 이미지 선택, 교체, 삭제
- 입력 필드 스타일 조정

사용자 모드에서 제한되는 기능:

- 문서 본문 직접 수정
- 표 행/열/셀 구조 변경
- 입력 필드 삭제 또는 이동
- 템플릿 원본 저장

## 주요 파일

- `DynamicFormsPoc.sln`: Visual Studio 2017 솔루션
- `DynamicFormsPoc/DynamicFormsPoc.csproj`: .NET Framework 4.5.2 WinForms 프로젝트
- `DynamicFormsPoc/packages.config`: CefSharp 107.1.120 패키지 고정
- `DynamicFormsPoc/Forms/MainForm.cs`: 메인 화면, 관리자/사용자 모드, 템플릿 목록, 합본 관리
- `DynamicFormsPoc/Forms/PreviewForm.cs`: 합본 미리보기 및 인쇄 화면
- `DynamicFormsPoc/Services/EditorService.cs`: C#에서 JavaScript `editor.*` 함수를 호출하는 브리지
- `DynamicFormsPoc/Services/TemplateStore.cs`: JSON 템플릿 저장/불러오기 및 데모 샘플 생성
- `DynamicFormsPoc/Services/TempImageService.cs`: 세션 임시 이미지 폴더 관리
- `DynamicFormsPoc/Html/editor.*`: Summernote 초기화, A4 편집 영역, 입력 필드, 모드 잠금, 인쇄 CSS
- `DynamicFormsPoc/Html/preview.html`: 합본 미리보기 HTML

## 실행 방법

1. Windows 개발 PC에서 Visual Studio 2017을 엽니다.
2. `.NET Framework 4.5.2 Developer Pack`이 설치되어 있는지 확인합니다.
3. `DynamicFormsPoc.sln`을 엽니다.
4. NuGet 패키지 복원을 실행합니다.
5. 구성은 `Debug|x64` 또는 `Release|x64`로 빌드합니다.
6. 실행 후 좌측 템플릿 목록에서 샘플을 열거나 `새 템플릿`으로 시작합니다.

## 샘플 템플릿

초기 실행 시 다음 샘플을 생성합니다.

- `샘플 - 검사성적서`
- `샘플 - 외관 검사`
- `샘플 - CC Tray Inspection Report`
- `샘플 - 평면도 검사`
- `샘플 - Ceramic Filter Treatment Result`

샘플은 고객사 화면과 비슷한 표 중심 성적서 구조, 콤보박스, 체크박스, 이미지 영역을 보여주기 위한 가상 데이터입니다.

## JSON 저장 위치

실행 폴더 기준:

```text
Data/Templates
```

템플릿 JSON에는 다음 정보만 저장합니다.

- `id`
- `name`
- `html`
- `createdAt`
- `updatedAt`

사용자 모드에서 입력한 값, 선택한 이미지 파일, 출력 이력은 저장하지 않습니다. 템플릿 저장 시 `editor.getTemplateHtml()`에서 입력값과 이미지 경로를 초기화합니다.

## 임시 이미지

사용자 모드에서 이미지 필드를 클릭하면 C# `OpenFileDialog`로 로컬 이미지를 선택합니다. 선택한 이미지는 실행 세션 전용 폴더로 복사하고 브라우저에는 `file://` URL을 전달합니다.

```text
Data/Temp/{session-guid}
```

앱 종료 시 현재 세션 폴더를 삭제합니다. 삭제 실패는 무시해서 앱 종료를 막지 않습니다. 템플릿 JSON에는 이미지 base64나 원본 경로를 저장하지 않습니다.

## C# / JavaScript 브리지

C#에서 호출하는 JavaScript 함수는 `DynamicFormsPoc/Services/EditorService.cs`에 모아두었습니다.

대표 함수:

- `editor.newTemplate()`
- `editor.getTemplateHtml()`
- `editor.setTemplateHtml(html)`
- `editor.setMode("design" | "fill")`
- `editor.resetValues()`
- `editor.promptInsertTable()`
- `editor.insertTable(rows, columns)`
- `editor.addTableRow()`
- `editor.deleteTableRow()`
- `editor.addTableColumn()`
- `editor.deleteTableColumn()`
- `editor.mergeCell()`
- `editor.splitCell()`
- `editor.toggleHeaderCell()`
- `editor.setCellSize()`
- `editor.insertTextField(config)`
- `editor.insertNumberField(config)`
- `editor.insertSelectField(config)`
- `editor.insertCheckboxField(config)`
- `editor.insertImageField(config)`
- `editor.getCurrentDocumentHtml()`
- `editor.printDocument()`

JavaScript에서 C#으로 보내는 메시지는 `CefSharp.PostMessage(JSON.stringify(message))`를 사용합니다.

대표 이벤트:

- `editor-ready`
- `content-changed`
- `choose-image`
- `image-remove`
- `error`

## 합본과 출력

- 합본 목록은 `MainForm` 메모리에만 유지합니다.
- `합본에 추가` 시 현재 브라우저 DOM을 `editor.getCurrentDocumentHtml()`로 가져와 입력값과 이미지 URL을 포함한 스냅샷으로 추가합니다.
- 각 합본 항목은 `PreviewForm`에서 별도 `.a4-page`로 렌더링됩니다.
- `@media print`에서 페이지 그림자, 배경, 이미지 버튼, 콤보 컨트롤 외곽선을 숨깁니다.
- 콤보박스는 인쇄 직전 선택 텍스트를 별도 `span.print-value`로 만들어 출력합니다.
- 인쇄는 `preview.printDocument()`에서 `window.print()`를 호출하는 단순 방식입니다.

## 데모 절차

1. 프로그램 실행
2. 좌측 샘플 템플릿 선택
3. `관리자 모드`에서 에디터 내부 WYSIWYG 툴바로 표/폰트/셀 스타일 수정
4. 표 셀 안에 커서를 두고 에디터 내부 `텍스트`/`숫자`/`콤보`/`체크`/`이미지` 버튼으로 입력 영역 삽입
5. `저장`
6. `사용자 모드`로 전환
7. 고정 문구와 표 구조가 수정되지 않는지 확인
8. 텍스트/숫자 입력, 콤보 선택, 체크박스 선택
9. 이미지 영역의 `선택` 버튼으로 이미지 첨부
10. 입력 필드에 포커스를 둔 뒤 WYSIWYG 툴바로 글꼴/크기/색상 조정
11. `합본에 추가`
12. 다른 템플릿도 사용자 모드에서 입력 후 `합본에 추가`
13. 우측 합본 목록에서 `위로`/`아래로` 순서 변경
14. `합본 미리보기`
15. 미리보기 창에서 `인쇄`
16. 앱 재실행 후 좌측 저장 템플릿 목록 복원 확인

## 빌드 확인 결과

현재 작업 환경은 macOS + .NET 10 SDK입니다. 이 환경에는 Windows용 .NET Framework 4.5.2 targeting pack과 Visual Studio 2017 MSBuild가 없어 실제 WinForms 빌드는 완료할 수 없었습니다.

확인한 내용:

- `dotnet msbuild DynamicFormsPoc.sln /p:Configuration=Debug /p:Platform=x64 /t:Restore`는 솔루션을 읽었고, `packages.config` 방식이라 `dotnet restore` 대상은 없다고 보고했습니다.
- `dotnet msbuild DynamicFormsPoc.sln /p:Configuration=Debug /p:Platform=x64`는 `MSB3644: The reference assemblies for .NETFramework,Version=v4.5.2 were not found`로 중단되었습니다.
- `DynamicFormsPoc.csproj`, `packages.config`, `App.config` XML 문법 검사를 통과했습니다.
- `Html/editor.js`와 `preview.html` 내 inline script 구문 검사를 통과했습니다.

Windows + VS2017 + .NET Framework 4.5.2 Developer Pack 환경에서 최종 빌드 확인이 필요합니다.

## 제한사항과 TODO

- WYSIWYG v1은 Summernote CDN 기반 데모용 구현입니다. Word 수준의 정밀 편집, 복잡한 표 편집, 실행 취소 고도화는 없습니다.
- 완전 오프라인 실행이 필요하면 CDN 파일을 프로젝트에 포함하는 작업이 필요합니다.
- 실제 사용자/권한/전자결재 연동은 없습니다. 고객 데모에서는 관리자 모드와 사용자 모드 전환으로 결재 전후 상태를 표현합니다.
- 이미지 크롭/회전/영구 저장은 구현하지 않았습니다.
- 같은 템플릿을 여러 번 합본에 추가할 수 있으며, 합본 목록은 세션 종료 시 사라집니다.
- 로컬 이미지 접근은 `file://` URL과 CefSharp 파일 접근 옵션을 사용합니다. 배포 보안 요구가 생기면 custom scheme handler로 교체하는 것이 좋습니다.
- 인쇄는 Chromium의 기본 `window.print()`에 의존합니다. 특정 CefSharp/Chromium 환경에서 미리보기 UI가 제한되면 `ChromiumWebBrowser.Print()` 호출 방식으로 조정할 수 있습니다.
- CefSharp 107 계열은 오래된 Chromium이라 보안 업데이트 목적의 최신화가 필요하면 .NET Framework 요구사항을 4.6.2 이상으로 올리는 별도 의사결정이 필요합니다.
