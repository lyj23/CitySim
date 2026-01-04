# Excel转JSON工具使用说明

这个工具用于将config目录下的Excel文件转换为JSON格式，方便在GitHub Pages等静态托管环境中使用。

## 安装依赖

```bash
npm install
```

## 转换Excel为JSON

运行以下命令将所有Excel文件转换为JSON：

```bash
npm run convert:excel
```

转换后的JSON文件将保存在 `config/json/` 目录下。

## 支持的Excel文件

以下Excel文件会被转换为JSON：

- Building.xlsx
- BuildingType.xlsx
- Company.xlsx
- CompanyType.xlsx
- DayTick.xlsx
- FamilyGen.xlsx
- FirstName.xlsx
- House.xlsx
- HouseGen.xlsx
- HouseType.xlsx
- Job.xlsx
- LastName.xlsx
- NpcAbilityGen.xlsx
- PlayerData.xlsx
- RoadBlock.xlsx
- RoadBlockType.xlsx
- TagGen.xlsx
- TerBlock.xlsx
- TerBlockType.xlsx

## 使用方式

### 方式一：在GitHub Pages上使用（推荐）

1. 修改Excel文件中的数据
2. 运行 `npm run convert:excel` 转换为JSON
3. 提交到Git仓库
4. 在GitHub Pages上访问应用
5. 点击"加载配置JSON"按钮加载数据

### 方式二：本地开发使用

**注意**：由于浏览器的安全策略，直接双击打开HTML文件无法使用"加载配置JSON"功能。有以下两种替代方案：

#### 方案A：使用本地服务器（推荐用于测试）

1. 安装VSCode的 Live Server 扩展
2. 在 index.html 上右键选择 "Open with Live Server"
3. 点击"加载配置JSON"按钮加载数据

#### 方案B：直接导入Excel文件

如果不使用本地服务器，可以直接使用控制面板中的"导入Excel"功能：
1. 点击"导入Excel（按文件名识别表格）"按钮
2. 选择需要导入的Excel文件
3. 系统会自动识别并导入对应的数据表

## 工作流程

1. 修改Excel文件中的数据
2. 运行 `npm run convert:excel` 转换为JSON
3. （可选）提交到Git仓库
4. 在GitHub Pages或本地服务器上访问应用
5. 点击"加载配置JSON"按钮加载数据

## 注意事项

- 转换操作会覆盖 `config/json/` 目录下已有的JSON文件
- 每次修改Excel数据后都需要重新运行转换命令
- JSON文件会保留Excel中的所有sheet作为对象的属性
- 本地开发建议使用 Live Server 或其他本地服务器
