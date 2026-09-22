# وثيقة القرارات التقنية الموحّدة (TDD) — BIETMI ERP

وثيقة القرارات التقنية الموحّدة  
Technical Decisions Document (TDD)  
مشروع نظام ERP — EURL BIETMI PLUS  
المرجع الرسمي الوحيد للمنهجية، البنية المعمارية، حزمة التقنيات، والاستضافة  

| رقم النسخة | Version 1.0 |
|---|---|
| الوثيقة المرجعية المكمّلة | BIETMI_ERP_SRS_v1.docx |
| الحالة | معتمدة — مرجع إلزامي |
| التاريخ | 22 أوت 2026 |

## 1. الغرض من هذه الوثيقة

تجمع هذه الوثيقة كل القرارات التقنية والتنظيمية المتفق عليها لبناء نظام ERP لشركة BIETMI، في مرجع واحد محدَّث ونهائي. أي قرار وارد هنا يُعتمد كأساس إلزامي للتطوير — سواء من طرف مبرمج بشري أو وكيل ذكاء اصطناعي. عند أي تعارض بين نقاش سابق غير موثَّق هنا وبين ما ورد في هذه الوثيقة، **يُعتمد ما ورد في هذه الوثيقة فقط**. هذه الوثيقة مكمِّلة لوثيقة متطلبات النظام (SRS v1.0) التي تحدد ماذا يبني النظام، بينما تحدد هذه الوثيقة كيف يُبنى.

## 2. منهجية إدارة المشروع

### 2.1 الإطار العام

تُدار عملية التطوير وفق منهجية Agile/Scrum مصغّرة، تناسب فريقاً صغيراً وعميلاً غير تقني تتوضح احتياجاته تدريجياً.

- مدة كل Sprint: أسبوعان.
- Product Owner: شخص واحد محدَّد من طرف BIETMI، وهو صاحب القرار النهائي على الأولويات والموافقات.
- مراجعة نهاية كل Sprint (Sprint Review): عرض حي لما تم بناؤه فعلياً، وليس شرائح أو وعوداً.
- أي طلب تغيير بعد اعتماد SRS يُسجَّل كـ'طلب تغيير رسمي' (Change Request)، ويُقيَّم أثره على الوقت/التكلفة قبل التنفيذ.

### 2.2 خارطة الطريق العامة (5 مراحل)

| المرحلة | المحتوى |
|---|---|
| المرحلة 1 (موثَّقة بالكامل في SRS v1.0) | الزبائن، الموردون، الفواتير (بيع/شراء)، العقود، الصلاحيات الأساسية. |
| المرحلة 2 | ملف المشروع الموحّد، عروض الأسعار، المشتريات الكاملة والاستيراد، المخزون، الإنتاج. |
| المرحلة 3 | خدمة ما بعد البيع: سجل المعدات، عقود الصيانة، جدولة الفنيين، وضع العمل دون اتصال. |
| المرحلة 4 | المحاسبة الكاملة (SCF)، الفوترة المرحلية، الرواتب والموارد البشرية. |
| المرحلة 5 | الجودة والسلامة، لوحات التحكم والتقارير، إدارة الوثائق المتقدمة. |

### 2.4 توضيح إلزامي: PWA ≠ عمل دون اتصال (Offline)

نُفِّذ في هذه المرحلة PWA **أساسي فقط** (تثبيت كتطبيق: أيقونة + فتح بلمسة واحدة — Installability). الـ Service Worker يخزّن الملفات الثابتة فقط (الأيقونات، CSS/JS المبني، واجهة shell) ولا يلمس أبداً طلبات `/api/*`. هذا **لا** يعني أن المنصة تعمل دون اتصال بأي حال.

العمل دون اتصال الحقيقي (IndexedDB، مزامنة تلقائية بعد استعادة الاتصال، إنشاء فواتير/عروض/أوامر شراء دون اتصال) **مؤجَّل عمداً وحصرياً** لسياق **المرحلة 3 — الفنيون الميدانيون** (خدمة ما بعد البيع، كما ورد في جدول خارطة الطريق أعلاه)، وليس للاستخدام المكتبي العام. السبب الجوهري للتأجيل: حماية **سلامة الترقيم التسلسلي القانوني للفواتير (REQ-303)** من أي خطر قد ينجم عن بناء أو مزامنة وثائق مالية دون اتصال.

القاعدة المرجعية لمنع أي التباس مستقبلي: **ظهور خيار "تثبيت" في المتصفح لا يعني وجود Offline؛ وقدرة Offline لا تُضاف إلا ضمن مرحلة مستقلة مخصصة حصرياً لخدمة ما بعد البيع (الفنيون الميدانيون).**

### 2.3 خطة Sprints — المرحلة الأولى

| الفترة | Sprint | المحتوى |
|---|---|---|
| الأسبوع 0 | تهيئة | بنية تحتية (VPS)، تصميم قاعدة البيانات، تثبيت Stack. |
| الأسبوع 1-2 | Sprint 1 | مستخدمون وصلاحيات (REQ-501/502) + إدارة الزبائن (REQ-101→104). |
| الأسبوع 3-4 | Sprint 2 | الموردون (REQ-201→203) + محرك الفوترة الكامل (REQ-301→306). |
| الأسبوع 5-6 | Sprint 3 | العقود (REQ-401→403) + اختبار تكامل + UAT + تسليم رسمي. |

## 3. البنية المعمارية للنظام

### 3.1 النمط المعماري المعتمد

القرار: Modular Monolith — تطبيق واحد متكامل (Deployment واحد)، لكن مقسَّم داخلياً إلى موديولات معزولة منطقياً (كل موديول: Controller + Service + Repository/Entity + واجهة وصول محددة). يُستبعَد نمط Microservices لعدم ملاءمته لحجم الفريق والمشروع، ويُستبعَد Monolith التقليدي غير المنظَّم لخطر تحوّله إلى كود متشابك (Spaghetti Code) مع تراكم المراحل.

### 3.2 طبقات النظام (Layered Architecture)

- طبقة العرض (Presentation) — واجهة الويب (React).
- طبقة API (REST API) — نقطة الاتصال الوحيدة بين الواجهة والمنطق.
- طبقة منطق الأعمال (Business Logic) — حساب TVA، الترقيم التسلسلي، قواعد الصلاحيات.
- طبقة الوصول للبيانات (Data Access) — عبر ORM.
- قاعدة البيانات (PostgreSQL).

### 3.3 مخطط النشر على الخادم

Nginx كـ Reverse Proxy يستقبل كل الطلبات، يخدم ملفات الواجهة الثابتة (Static Build)، يوجّه طلبات API للـ Backend، ويدير شهادة HTTPS (SSL عبر Let's Encrypt). قاعدة البيانات منفصلة منطقياً عن التطبيق لتسهيل نقلها لاحقاً عند الحاجة دون تعديل الكود.

### 3.4 الأمان (Security Architecture)

- HTTPS إلزامي على كل الاتصالات.
- تشفير كلمات المرور بخوارزمية bcrypt — لا تُخزَّن أبداً كنص صريح.
- RBAC على مستوى الـ API نفسه، وليس فقط الواجهة — الصلاحية تُتحقَّق في كل طبقة، لا تُخفى فقط في الواجهة.
- Rate Limiting على نقاط تسجيل الدخول لمنع محاولات الاختراق المتكررة.

## 4. حزمة التقنيات المعتمدة (Tech Stack)

هذا الجدول هو المرجع الوحيد والنهائي — يُلغي ويحل محل أي جدول تقنيات ورد في نقاشات سابقة غير موثَّقة هنا.

| الطبقة | التقنية المعتمدة | ملاحظة |
|---|---|---|
| Frontend | React.js (عبر Vite) + TypeScript + React Router + Tailwind CSS | SPA كلاسيكي. Next.js مُستبعَد صراحة — لا حاجة لـSSR/SEO في نظام داخلي خلف تسجيل دخول. |
| Backend | NestJS (Framework) + TypeScript | يفرض بنية Modular Monolith بنيوياً عبر Modules/Controllers/Services. |
| قاعدة البيانات | PostgreSQL 15+ | يدعم Transactions آمنة — ضروري للترقيم التسلسلي القانوني للفواتير. |
| ORM | Prisma | يبسّط الحقول المرجعية Nullable المستقبلية ويولّد Migrations منظمة. |
| المصادقة | JWT + Passport.js | معيار قياسي متكامل مع NestJS. |
| Reverse Proxy | Nginx | يخدم Frontend + يوجّه API + يدير SSL. |
| نظام التشغيل | Ubuntu Server 22.04 LTS | — |

ملاحظة حول لغة البرمجة: TypeScript ليس لغة مستقلة، بل امتداد مُطعَّم بالأنواع (Typed Superset) فوق JavaScript، يُترجَم إليه قبل التنفيذ. اعتماده في كل من Frontend وBackend يقلّل الأخطاء المنطقية الخفية، ويسهّل مراجعة الكود الناتج عن وكيل الذكاء الاصطناعي.

## 5. نموذج البيانات المنطقي (Logical Data Model)

هذا القسم هو المرجع الرسمي الوحيد لبنية الكيانات وعلاقاتها. أي Migration أو Schema يجب أن يطابقه حرفياً. غيابه من نسخة سابقة من هذه الوثيقة كان السبب المباشر لانحراف تنفيذ Sprint 1 (بناء جدول `customers` منفصل بدل `Partner` موحّد) — لن يتكرر هذا الغياب.

### 5.1 الكيان المركزي: Partner (موحّد للزبون والمورد معاً)

لا يوجد جدولان منفصلان `Customer` و`Supplier`. يوجد كيان واحد **`Partner`** يحمل حقل `type` يميّز بينهما. هذا يخدم هدفين: (1) إعادة استخدام نفس منطق البحث/الفرز/الفوترة لاحقاً لكليهما، و(2) السماح مستقبلاً لطرف واحد أن يكون زبوناً ومورداً معاً دون ازدواجية.

| الحقل | النوع | ملاحظة |
|---|---|---|
| id | UUID (PK) | يُولَّد عند الإنشاء، لا يتغيّر أبداً — أي Migration مستقبلية يجب أن تحافظ عليه حرفياً |
| type | enum: customer / supplier | يحدد الفلترة في `/customers` مقابل `/suppliers` |
| name | string | إلزامي |
| commercialRegister | string, nullable | رقم السجل التجاري |
| nif | string, nullable, unique | الرقم الجبائي |
| address | string, nullable | |
| paymentTerms | string, nullable | خاص بالموردين أساساً (شروط الدفع)، متاح أيضاً للزبائن |
| currency | enum: DZD / FOREIGN | عملة التعامل — مهم خصوصاً لموردي الاستيراد (DEMAG, WEIHUA) |
| isActive | boolean, default true | Soft-delete بدل الحذف الفعلي عند وجود قيود مرتبطة |
| createdAt / updatedAt | datetime | |

**نقاط الوصول في الـAPI**: `/customers` (يفرض `type=customer` دائماً، صلاحيات `admin`+`commercial`) و`/suppliers` (يفرض `type=supplier` دائماً، صلاحيات `admin`+`purchasing`) — كلاهما يستدعيان نفس `PartnersService` المشترك في الخلفية. هذا يحقق الفصل الكامل في الواجهة والصلاحيات، مع الوحدة الكاملة في قاعدة البيانات.

### 5.2 Contact (جهات الاتصال) — جدول علائقي منفصل، وليس حقلاً واحداً

**قرار محسوم صراحة**: `Partner` **لا** يحمل حقلي `contactPerson`/`phone` مباشرة. بدلاً من ذلك، علاقة **One-to-Many** إلى جدول `Contact` منفصل — لأن الزبون أو المورد الواحد (خصوصاً شركة كبرى مثل Cevital أو مورد دولي مثل DEMAG) يملك عادة أكثر من جهة اتصال واحدة (مبيعات، دعم فني، محاسبة).

| الحقل | النوع | ملاحظة |
|---|---|---|
| id | UUID (PK) | |
| partnerId | UUID (FK → Partner) | |
| name | string | |
| phone | string, nullable | |
| email | string, nullable | |
| isPrimary | boolean, default false | جهة الاتصال الرئيسية المعروضة أولاً |

### 5.3 Invoice و InvoiceLine (الفواتير وبنودها)

فاتورة واحدة تحتوي عدة بنود (One-to-Many إلى `InvoiceLine`) — وهذا ضروري لأن REQ-301 يتطلب "بنود متعددة (وصف، كمية، سعر الوحدة)".

**Invoice**: id (PK), invoiceNumber (unique, يُولَّد من الخادم فقط ضمن Transaction آمنة — REQ-303), type (sale/purchase), partnerId (FK), createdByUserId (FK → User), issueDate, dueDate (nullable), status (draft/issued/partially_paid/paid/overdue), subtotal, tvaAmount, totalAmount, internalReference (نص حر اختياري — REQ-305), createdAt/updatedAt.

**حقول مرجعية Nullable للمستقبل** (موجودة في قاعدة البيانات، غير ظاهرة في الواجهة أو الـAPI حتى المرحلة 2): `projectId`, `contractId`, `paymentStage`, `equipmentId`.

**InvoiceLine**: id (PK), invoiceId (FK), description, quantity, unitPrice, lineTotal (محسوب).

### 5.4 Contract (العقود)

id (PK), contractNumber (unique), type (sale/purchase), partnerId (FK), createdByUserId (FK), startDate, endDate (nullable), totalValue, description. **حقول مرجعية Nullable للمستقبل**: `projectId`, `contractTypeDetail`, `renewalAlertDate`.

### 5.5 User (المستخدمون)

id (PK), username (unique), passwordHash, role (enum: admin/commercial/purchasing/accountant), fullName, isActive, createdAt, **workspace** (enum: `production` / `sandbox` — افتراضي `production`).

### 5.6 مخطط العلاقات المختصر

```
Partner (1) ──< (N) Contact
Partner (1) ──< (N) Invoice ──< (N) InvoiceLine
Partner (1) ──< (N) Contract
Partner (1) ──< (N) Quote ──< (N) QuoteLine
Quote (1) ── has many revisions ──< (N) Quote   [supersedesQuoteId — علاقة ذاتية، غير فريدة]
Partner (N) ──< (M) SupplierCategory   [جدول ربط ضمني `_PartnerToSupplierCategory` — خاص بالموردين]
User    (1) ──< (N) Invoice   [createdByUserId]
User    (1) ──< (N) Contract  [createdByUserId]
User    (1) ──< (N) Quote     [createdByUserId]
```

**ملاحظة عزل Workspace**: الكيانات الرئيسية (Partner, SupplierCategory, Invoice, Quote, PurchaseOrder, InvoiceCounter, QuoteCounter, PurchaseOrderCounter) تحمل `workspace Workspace @default(production)` — لا يظهر في مخطط العلاقات لأن العلاقة المضمونة فريدة لكل `workspace` عبر القيود الفريدة متعددة الأعمدة (§5.9).

### 5.7 SupplierCategory (تصنيفات الموردين) — علاقة Many-to-Many

قرار محسوم: التصنيفات كيان مستقل **`SupplierCategory`** مع علاقة **Many-to-Many** إلى `Partner` (عبر جدول ربط ضمني لـ Prisma `_PartnerToSupplierCategory`)، لأن المورد الواحد ينتمي لأكثر من تصنيف (استيراد، قطع غيار، خدمات) والتصنيف الواحد يضم عدّة موردين. نقطة الوصول: `/supplier-categories`.

| الحقل | النوع | ملاحظة |
|---|---|---|
| id | UUID (PK) | |
| name | string, unique | اسم التصنيف — فريد لمنع التكرار |
| createdAt | datetime | |

**قواعد العمل**:
- `POST/PATCH/DELETE /supplier-categories` متاحة لصلاحية `admin` فقط؛ `GET` مفتوحة لجميع الأدوار (تُستخدم في قوائم الفلترة).
- `DELETE` يُرفض بحالة **409** إذا كان التصنيف مرتبطاً بأي مورد.
- عرض/تعديل المورد (`POST/PATCH /suppliers`) يقبل `categoryIds: string[]` ويستبدل الارتباط كلياً عند تمريره (`set`).
- فلترة قائمة الموردين عبر `GET /suppliers?categoryId=<uuid>` بمنطق **ANY/OR**: قيم مفصولة بفواصل (`categoryId=a,b`) ترجع الموردين المنتمين لأي تصنيف منها — لا يشترط تطابق كل التصنيفات.

### 5.8 Quote و QuoteLine و QuoteCounter (عروض الأسعار وبنودها وعداداتها)

عرض سعر واحد يحتوي عدة بنود (One-to-Many إلى `QuoteLine`).

**Quote**: id (PK, UUID), quoteNumber (unique، يُولَّد من الخادم فقط ضمن Transaction آمنة بصيغة `QT-YYYY-XXXXX` — السنة + لاحق من 5 خانات)، partnerId (FK → Partner)، createdByUserId (FK → User)، status (enum: draft/sent/accepted/rejected/revision_requested)، objet (nullable)، subtotal/discountPercent/discountAmount/tvaAmount/totalAmount (Decimal)، paymentMethods (JSON nullable)، supersedesQuoteId (FK ذاتي → Quote، nullable، **غير فريد** — يجوز لأصل واحد أكثر من نسخة)، convertedToInvoiceId (FK → Invoice، nullable)، createdAt/updatedAt.

**QuoteLine**: id (PK), quoteId (FK), description, unit (nullable), quantity, unitPrice, lineTotal (محسوب).

**QuoteCounter**: id (PK, UUID عشوائي)، year (Int، فريد)، lastNumber — عدّاد واحد لكل سنة بمنطق `INSERT ... ON CONFLICT ("year") DO UPDATE SET last_number = last_number + 1`، تماماً كنمط عدّاد الفواتير.

**آلة الحالات (State Machine)**:
```
draft ──send──> sent
sent ──> accepted | rejected | revision_requested      (الثلاث حالات نهائية)
revision_requested ──[POST /quotes/:id/create-revision فقط]──> نسخة جديدة draft
```

**قواعد العمل الحاسمة**:
- `revision_requested` حالة **نهائية مجمَّدة للعرض الأصلي**: يُمتنع نهائياً `PATCH` التعديل وإعادة الإرسال (`POST /send`) — كلاهما يُرفض بحالة **409**. الاختصار الوحيد هو إنشاء نسخة جديدة.
- `POST /quotes/:id/create-revision` ينسخ إلى عرض جديد بحالة `draft`: partnerId + objet + discountPercent + paymentMethods + بنود العرض، مع ترقيم تسلسلي جديد، و`supersedesQuoteId` = الأصل. **لا تُكتب أي حقل على الأصل** (يبقى مجمّداً تماماً، حتى `updatedAt`)، ويُرفض بـ 409 إذا لم تكن حالة الأصل `revision_requested`.
- العلاقة الذاتية تُمكّن الواجهة من عرض روابط «نسخة معدَّلة من…» (supersedesQuote) و«استُبدِل بـ…» (revisions).
- `PATCH /quotes/:id` و`POST /quotes/:id/send` مقتصران على `draft` فقط؛ `GET` متاحة لصلاحيات `admin`+`commercial`، والكتابة مثلها.

### 5.9 عزل البيانات حسب Workspace — الكيان/'

كل كيان رئيسي يحمل حقل `workspace Workspace @default(production)` — مصفوفة `Workspace` التي تقبل قيمتين فقط: `production` (شركة BIETMI المشتركة) و`sandbox` (مساحة العمل الشخصية لكل مستخدم).

**الكيانات التي تحمل `workspace`**: User, Partner, SupplierCategory, Invoice, InvoiceCounter, Quote, QuoteLine, QuoteCounter, PurchaseOrder, PurchaseOrderCounter.

**القيود الفريدة** متعددة الأعمدة وتتضمن `workspace` لضمان عدم تعارض الأرقام التسلسلية عبر المساحات:
- `@@unique([workspace, nif])` — على Partner
- `@@unique([workspace, name])` — على SupplierCategory
- `@@unique([workspace, invoiceNumber])` — على Invoice
- `@@unique([workspace, year])` — على InvoiceCounter وQuoteCounter
- `@@unique([workspace, quoteNumber])` — على Quote
- `@@unique([workspace, orderNumber])` — على PurchaseOrder
- `@@unique([workspace])` — على PurchaseOrderCounter

**منطق العزل في الخادم**:
- JWT يحمل `workspace` من المستخدم الحالي — لا يُقبل من الـ Body.
- كل استعلام `findMany`/`findUnique`/`update`/`delete` يضيف `where: { ...filter, workspace }`.
- كل `create` يضبط `data: { ...body, workspace: user.workspace }`.
- مسارات POST (إنشاء) تتجاوز الحقل المُرسل في Body إن وُجد (حماية "Body Leak").
- الوصول العكسي عبر معرف معروف (`partnerId` مثلاً) يُرفض بـ **404** إذا لم يكن الكيان في نفس الـ workspace — مهما كان نوع الخطأ (شريك غير موجود أو من نوع مختلف).

**Backfill**: Migration `20260916000000_add_workspace_isolation` يضبط `workspace = 'production'` لكل السجلات القديمة — لا توجد بيانات sandbox في الإنتاج.

## 6. سياسة العمل مع وكيل الذكاء الاصطناعي في كتابة الكود

بما أن الكود يُكتب بواسطة وكيل ذكاء اصطناعي، تُعتمد الضوابط التالية إلزامياً:

- يُعطى الوكيل، في بداية كل جلسة عمل، هذه الوثيقة ووثيقة SRS كسياق مرجعي كامل — وليس وصفاً شفهياً مختصراً للمهمة.
- كل REQ من وثيقة SRS يُنفَّذ ويُختبَر مقابل 'معيار القبول' المكتوب له تحديداً، وليس الاكتفاء بأن الكود 'يعمل' ظاهرياً.
- اختيار Framework صارم (NestJS) بدل Library حرة (Express) مقصود لفرض بنية موحّدة تلقائياً، بغض النظر عمّن يكتب الكود أو في أي جلسة.
- مراجعة بشرية إلزامية في نهاية كل Sprint (Sprint Review) كنقطة تحقق حقيقية، وليست شكلية.
- نقاط تدقيق أمني خاصة يجب التحقق منها يدوياً: الترقيم التسلسلي للفواتير (بدون تكرار تحت تزامن حقيقي)، وصلاحيات RBAC (منع وصول دور لبيانات دور آخر عبر تلاعب مباشر بالروابط).

## 7. البنية التحتية والاستضافة

### 6.1 القرار الاستراتيجي العام

تُستبعَد صراحة كل من: Cloud SaaS الدولي العام (سيادة بيانات + عملة صعبة)، منصات PaaS/Serverless مثل Vercel/Render (لا تدعم Backend دائم + قاعدة بيانات كاملة بالشكل المطلوب)، والاستضافة المشتركة (Hébergement Mutualisé — لا تتيح Root ولا تشغيل Node.js/PostgreSQL). القرار الوحيد المعتمد: VPS بصلاحية Root كاملة.

### 6.2 مرحلة التعلّم الحالية (مؤقتة)

| البند | التفاصيل |
|---|---|
| المزوّد | Octenium (جزائري، خوادم فيزيائية داخل الجزائر) |
| الباقة | VPS Advanced — 2 vCPU / 4GB RAM / 80GB SSD NVMe |
| السعر | 2,400 دج/شهر |
| الغرض | التعلّم والتجربة فقط — بيانات تجريبية، بدون نسخ احتياطي مدفوع (Backup Storage خدمة منفصلة عندهم). |
| ملاحظة | توثيق كل أمر Linux يُنفَّذ أثناء الإعداد لتحويله لاحقاً إلى سكريبت تثبيت آلي قابل لإعادة الاستخدام على الخادم النهائي. |

### 6.3 مرحلة الإنتاج المستهدفة (بعد إتمام التعلّم)

| البند | التفاصيل |
|---|---|
| المزوّد المرجَّح | Algérie Télécom (Entreprises) |
| السبب | بيانات داخل الجزائر صراحة، خلفية مؤسساتية هي الأقوى في السوق (مشغّل الدولة)، نسخ احتياطي يومي مُضمَّن ضمن السعر، ترافيك غير محدود، حماية Anti-DDoS مُضمَّنة. |
| الباقة المرجَّحة | Pack 2 — 2 vCPU / 8GB RAM / 100GB SSD |
| السعر التقديري | ~4,522 دج/شهر (شامل TVA) |
| إجراء معلَّق يجب التحقق منه | تأكيد أن لوحة التحكم (AAPanel) لا تفرض قيوداً على تثبيت PostgreSQL يدوياً عبر Root SSH. |
| ملاحظة إجرائية | طلب عرض السعر يتطلب تواصلاً مباشراً (نموذج/بريد مؤسساتي)، وليس شراءً فورياً عبر الموقع — يُنصَح ببدء الإجراء الإداري بالتوازي مع مرحلة التعلّم لتفادي التأخير لاحقاً. |

### 6.4 بدائل تم فحصها واستبعادها أو تأجيلها

| المزوّد/الخيار | الخلاصة |
|---|---|
| DZSecurity | VPS حقيقي بمواصفات مماثلة، لكن أغلى تقريباً بالضعف من Octenium وAlgérie Télécom لنفس المواصفات. |
| Oracle Cloud Free Tier | مفيد للتعلّم الفردي البحت (VPS حقيقي مجاني دائم)، يتطلب بطاقة بنكية للتحقق فقط. |
| Render / Vercel | PaaS وليس VPS — لا يدعم Backend دائم أو Root access. Render تحديداً يحذف قاعدة البيانات المجانية كل 30 يوماً. |
| Hostinger / أي مزوّد دولي | مستبعد نهائياً لمرحلة الإنتاج — يعيد مشكلتي العملة الصعبة وسيادة البيانات. |
| Dedicated Server | مبالغة كاملة لحجم الاستخدام الحالي والمتوقع مستقبلاً — غير مطروح في أي مرحلة من خارطة الطريق. |

## 8. سجل القرارات (Decision Log)

سجل مختصر لأهم القرارات وتاريخ اعتمادها، لتفادي تكرار نقاش سبق حسمه.

| # | القرار | الحالة |
|---|---|---|
| 1 | نطاق المرحلة 1: زبائن + موردون + فواتير + عقود فقط، مع حقول Nullable مستقبلية. | معتمد — موثَّق في SRS v1.0 |
| 2 | منهجية Agile/Scrum بدل Waterfall. | معتمد |
| 3 | Modular Monolith بدل Microservices أو Monolith تقليدي. | معتمد |
| 4 | Backend: NestJS + TypeScript بدل Express. | معتمد |
| 5 | Frontend: React عبر Vite بدل Next.js. | معتمد |
| 6 | استضافة تعلّم: Octenium VPS Advanced. | معتمد — مؤقت |
| 7 | استضافة إنتاج مرجَّحة: Algérie Télécom Pack 2. | قيد التفاوض — بانتظار عرض سعر رسمي |
| 8 | نموذج Partner موحّد (وليس Customer/Supplier منفصلين) — موثَّق بالتفصيل في القسم 5. Sprint 1 انحرف عن هذا لغياب هذا القسم من نسخة سابقة من الوثيقة؛ صُحِّح في Sprint 2. | معتمد — مُصحَّح |
| 9 | جهات الاتصال (Contact) جدول علائقي منفصل يدعم عدة جهات اتصال لكل Partner — وليس حقلاً واحداً `contactPerson` كما في المخطط المفاهيمي المبسَّط الأول. أدق لواقع عمل BIETMI (عملاء/موردون كبار بعدة جهات اتصال). | معتمد |
| 10 | REQ-503/504 (إدارة المستخدمين: إنشاء حسابات من طرف المدير فقط، إلزام تغيير كلمة المرور المؤقتة عند أول دخول) — اكتُشفت كفجوة في SRS الأصلي أثناء تصميم الشاشات، ويجب إضافتها رسمياً لوثيقة SRS. | معتمد — بانتظار تحديث SRS_v1.md |
| 11 | تصنيفات الموردين (`SupplierCategory`) كيان مستقل + علاقة Many-to-Many مع `Partner` (جدول ربط ضمني) — قرار محسوم، موثَّق بالقسم 5.7. | معتمد |
| 12 | ترقيم عروض الأسعار بصيغة `QT-YYYY-XXXXX` (سنة + لاحق 5 خانات) بعدّاد سنوي `QuoteCounter` منفصل لكل سنة — نفس نمط عدّاد الفواتير (موثَّق بالقسم 5.8). | معتمد |
| 13 | **مراجعة عروض الأسعار عبر نسخ جديدة فقط (Default-on-Revision)**: `revision_requested` حالة نهائية مجمَّدة للأصل (لا تعديل `PATCH` ولا إعادة إرسال — رفض 409)، وإنشاء نسخة معدَّلة حصرياً عبر `POST /quotes/:id/create-revision` مع `supersedesQuoteId` (علاقة ذاتية غير فريدة). **يُلغي القرار السابق** الذي كان يسمح بـ `PATCH` وإعادة الإرسال من `revision_requested` — الإلغاء بناءً على ملاحظة BIETMI الفعلية. موثَّق بالقسم 5.8. | معتمد — يلغي القرار السابق |
| 14 | **PWA أساسي — تثبيت كتطبيق فقط (Installability)**: `manifest.json` + Service Worker أساسي في `frontend/public/` يخزّن الملفات الثابتة فقط (الأيقونات، CSS/JS المبني، واجهة shell). **لا** أي cache لأي طلب `/api/*` — بيانات الفواتير/العروض/الزبائن/العقود تتطلب اتصالاً فعلياً بالخادم دائماً. اسم المانيفست عربي ثابت («نظام BIETMI ERP») لأن الـ Web App Manifest لا يدعم أسماء متعددة اللغات. العمل دون اتصال الحقيقي يبقى مؤجَّلاً حصرياً للمرحلة 3 (الفنيون الميدانيون) — توضيح إلزامي في القسم 2.4. | معتمد — نُفِّذ |
| 15 | **عزل Workspace — نموذج الشركة (Company-as-isolation)**: كل كيان رئيسي يحمل حقل `workspace` (enum `production` / `sandbox`) افتراضي `production`. الـ workspace يُustak من JWT فقط ولا يُقبل من الـ Body. القيود الفريدة متعددة الأعمدة وتتضمن `workspace` (عدّادات، أرقام تسلسلية). الوصول العكسي عبر معرف معروف (شريك مثلاً) يُرفض 404 إذا لم يكن في نفس الـ workspace — مهما كان نوع الخطأ. **لا** عزل مستخدمين فرديين (per-user) ولا Multi-tenancy كامل. موثَّق بالتفصيل في القسم 5.9. | معتمد — نُفِّذ |

## 9. الوثائق المرجعية المرتبطة

- BIETMI_ERP_SRS_v1.docx — وثيقة متطلبات النظام (المرحلة الأولى بالتفصيل).
- هذه الوثيقة (Technical Decisions Document) — القرارات التقنية والتنظيمية.

يجب تحديث هذه الوثيقة فوراً عند اتخاذ أي قرار تقني جديد أو تعديل قرار سابق، لتبقى المرجع الوحيد الموثوق — بدل الاعتماد على تتبّع محادثات متفرقة.
