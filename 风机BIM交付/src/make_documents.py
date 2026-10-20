"""Create source registry, point mapping template and readable A3 review atlas."""
from pathlib import Path
import json,csv,hashlib,math,textwrap
from collections import Counter
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1]
font='/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
F=lambda n:ImageFont.truetype(font,n,index=2)
source=ROOT/'references/Vestas_2MW_官方中文手册.pdf'
catalog={'id':'S01','title':'Vestas 2 MW 平台中文手册','url':'https://www.vestas.cn/content/dam/vestas-com/cn/product-/2MWfinal.pdf','download_alternate_url':'https://www.vestas.com/content/dam/vestas-com/cn/product-/2MWfinal.pdf','access_date':'2026-10-16','local_path':'references/Vestas_2MW_官方中文手册.pdf','sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'pdf_creation_date':'2017-10-09','pdf_modification_date':'2018-06-22','pages':16,'uses':{'4':'底座、轴承座及CoolerTop原理说明','8-9':'平台级机舱内部透视图，不是V90特定批次装配图','10':'V90-2.0 MW参数表'},'limitations':['不是原厂CAD/制造图；内部几何无法从单张透视图精确反求','历史版本；不能用于宣称最新生产配置','公开可访问不等于获得模型或图像的任意再发布授权；原资料版权归原作者']}
if not (ROOT/'data/source_catalog.json').exists():
 (ROOT/'data/source_catalog.json').write_text(json.dumps([catalog],ensure_ascii=False,indent=2))
params={'model_revision':'R01','target':'Vestas V90-2.0 MW, S01-era public-source reconstruction','source':'S01 p10','official_reference':{'rated_power_kw':2000,'rotor_diameter_m':90,'blade_length_m':44,'max_chord_m':3.9,'nacelle_length_m':10.4,'nacelle_width_m':3.5,'transport_height_m':4,'installed_height_including_cooler_m':5.4,'hub_height_option_m':80,'generator':'双馈发电机，滑环','pitch':'3液压缸全顺桨叶片制动','gearbox':'手册表述：二级行星齿轮和一级螺旋齿轮'},'chosen_reconstruction':{'hub_center_xyz_m':[-3.5,0,80],'rotor_axis':'X','tower_top_z_m':78.3,'tower_base_diameter_m':4.3,'tower_top_diameter_m':2.5,'tower_wall_m':0.045,'tower_sections':3,'shaft_tilt_deg':0,'cone_deg':0,'foundation_diameter_m':16,'foundation_thickness_m':2.2},'unverified':['塔筒分段与壁厚','实际轴倾角、锥角与叶根偏置','齿轮齿数、传动比与齿形','轴承类型、内部滚动体及公差','叶片翼型、扭角、预弯与铺层','电控/变流器/变压器实际位置','偏航驱动数量','基础地质、配筋、锚固与荷载']}
if not (ROOT/'data/model_parameters.json').exists():
 (ROOT/'data/model_parameters.json').write_text(json.dumps(params,ensure_ascii=False,indent=2))
points=[('DRIVE.BEARING','main_bearing_temperature','主轴承温度','degC'),('GEARBOX.STAGE.1','gearbox_oil_temperature','齿轮箱油温','degC'),('GEARBOX.STAGE.1','gearbox_vibration_rms','齿轮箱振动有效值','mm/s'),('GENERATOR.BODY','generator_speed','发电机转速','rpm'),('GENERATOR.BODY','active_power','有功功率','kW'),('GENERATOR.BODY','stator_temperature','定子温度','degC'),('YAW.BEARING','yaw_position','偏航角度','deg'),('PITCH.BEARING.1','blade_1_pitch','叶片1桨距角','deg'),('PITCH.BEARING.2','blade_2_pitch','叶片2桨距角','deg'),('PITCH.BEARING.3','blade_3_pitch','叶片3桨距角','deg'),('SENSOR.WIND','wind_speed','风速','m/s')]
points += [('SENSOR.WIND','wind_direction','传感器1风向','deg'),('SENSOR.WIND.2','wind_speed_2','传感器2风速','m/s'),('SENSOR.WIND.2','wind_direction_2','传感器2风向','deg')]
with (ROOT/'data/测点映射模板.csv').open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.writer(f);w.writerow(['asset_id','suggested_key','name','unit','actual_scada_tag','status']);w.writerows([(*p,'','UNMAPPED_NO_LIVE_DATA') for p in points])
W,H=2100,1485
NAVY='#183447';INK='#263f4e';GRAY='#637885';TEAL='#127e91';LIGHT='#eef3f5'

def page(number,title,subtitle):
 im=Image.new('RGB',(W,H),'white');d=ImageDraw.Draw(im)
 d.rectangle((0,0,W,150),fill=NAVY);d.text((65,31),title,font=F(42),fill='white');d.text((68,94),subtitle,font=F(22),fill='#bcd4df')
 d.line((65,H-74,W-65,H-74),fill='#c9d5db',width=2)
 d.text((65,H-55),'V90 / R01  |  公开资料重建  |  非原厂制造图  |  单位：m  |  2026-10-16',font=F(20),fill=GRAY)
 d.text((W-165,H-55),f'{number:02d} / 04',font=F(20),fill=GRAY)
 return im,d

def text(d,x,y,s,size=25,width=950,color=INK,spacing=10):
 line='';height=0;font=F(size)
 for ch in s:
  if ch=='\n' or d.textlength(line+ch,font=font)>width:
   d.text((x,y+height),line,font=font,fill=color);height+=size+spacing;line='' if ch=='\n' else ch
  else:line+=ch
 if line:d.text((x,y+height),line,font=font,fill=color);height+=size+spacing
 return y+height

def picture(im,path,box):
 pic=Image.open(path).convert('RGB');x,y,w,h=box;pic.thumbnail((w,h));xx=x+(w-pic.width)//2;yy=y+(h-pic.height)//2;im.paste(pic,(xx,yy));return (xx,yy,pic.width,pic.height)

pages=[]
im,d=page(1,'V90-2.0 MW  双馈风机 BIM 重建图册','整机与模型基准 / IFC4 · GLB · Blender / 审阅版')
picture(im,ROOT/'preview/01_整机.png',(45,180,1140,1120))
y=190
for head,body in [('模型对象','Vestas V90-2.0 MW。选取手册中的80m轮毂高度配置；不对应特定场站或设备序列号。'),('官方约束参数','额定功率 2,000 kW\n风轮直径 90m / 叶片长度 44m\n机舱长10.4m × 宽3.5m\n运输高度4m / 含顶部冷却器安装高5.4m'),('本版内容','163个可识别构件 / 12个系统\n可分离外罩、传动部件和辅助设施\n稳定构件编号与IFC GUID\n属性查询、剖切、系统分解浏览'),('精度边界','整体参数有官方依据；内部曲面、连接位置及细部尺寸主要为估算。基础、塔筒壁厚、叶片翼型均不能用于施工或制造。')]:
 y=text(d,1220,y,head,30,800,TEAL)+12;y=text(d,1220,y,body,25,795)+30
pages.append(im)
im,d=page(2,'机舱开放视图 / 部件索引','平台透视图参考 + 重建几何；编号仅用于图册索引，不是厂家部件号')
box=picture(im,ROOT/'preview/02_机舱开放.png',(40,200,1510,1040))
# Number markers are image-space callouts, no new geometrical claim.
import numpy as np
camera=np.array([-12,-17,94]);target=np.array([2,0,80.5]);forward=(target-camera);forward=forward/np.linalg.norm(forward)
right=np.cross(forward,[0,0,1]);right=right/np.linalg.norm(right);up=np.cross(right,forward)
anchors=[(-3.5,-.6,80),(-1.15,0,80),(0,-.8,79.8),(1.65,-.8,80),(4.25,0,80.22),(5.72,-.66,80.22),(7.17,-.3,80.22),(7,-1.6,83),(.1,-1.4,78.4),(.7,-1.1,79.4),(3.5,-1.2,79.08),(7.9,-1.2,79.6)]
marks=[(i+1,.5+np.dot(np.array(p)-target,right)/17,.5-np.dot(np.array(p)-target,up)/17*1600/1100) for i,p in enumerate(anchors)]
for n,x,y in marks:
 xx=box[0]+x*box[2];yy=box[1]+y*box[3];d.ellipse((xx-19,yy-19,xx+19,yy+19),fill=TEAL,outline='white',width=3);d.text((xx-10 if n<10 else xx-16,yy-14),str(n),font=F(22),fill='white')
items=['轮毂与变桨轴承','低速主轴','主轴承座','齿轮箱外壳','高速轴与联轴器','双馈发电机','滑环舱外罩','顶部冷却器','偏航系统','润滑与液压单元','检修通道','消防设备示意']
y=210
for n,name in enumerate(items,1):
 d.text((1580,y),f'{n:02d}',font=F(28),fill=TEAL);y=text(d,1640,y,name,25,385)+32
text(d,80,1270,'传动路径：风轮 → 低速主轴 → 齿轮箱 → 高速轴 / 联轴器 → 双馈发电机。仅示意机械传动关系。',24,1900)
pages.append(im)
im,d=page(3,'侧视与系统分解','用于空间关系审阅；分解距离人为设置，不代表检修拆卸顺序或吊装方案')
picture(im,ROOT/'preview/03_传动链侧视.png',(45,180,1000,790));picture(im,ROOT/'preview/04_系统分解示意.png',(1060,180,1000,790))
d.text((80,1010),'01  传动链侧视',font=F(32),fill=TEAL);d.text((1100,1010),'02  系统分解示意',font=F(32),fill=TEAL)
text(d,80,1070,'主轴、齿轮箱、联轴器与发电机沿传动方向布置。当前轴线偏置、机脚、支撑位置均未通过原厂总装图校核。齿轮箱仅建立外壳，无精确内部齿轮。',27,920)
text(d,1100,1070,'不同系统按预设方向平移展示。网页可连续调节分解程度并复位；IFC、GLB与源模型保存装配位置，不保存分解偏移。',27,900)
pages.append(im)
im,d=page(4,'资料追溯与交付说明','证据等级 / 文件索引 / 校验结果 / 后续补充资料')
y=195
for head,body in [('资料基准 S01','维斯塔斯中国官网 2MWfinal.pdf，16页。PDF制作时间2017年，修改时间2018年。第8–9页为2MW平台内部透视图；第10页为V90参数。原件和SHA-256校验值随包保存。'),('证据等级','A：官方文字确认参数或类型；B：平台图片提供布局参考；C：估算或示意几何。模型叶片标为“A尺寸/C曲面”，其余构件几何保守标C。不能由品牌及外观判断为原厂模型。'),('可编辑与交换文件','models/V90_reconstruction.blend：可编辑几何和属性。\nmodels/V90_reconstruction.ifc：IFC4层级、构件及来源属性。\nmodels/V90_reconstruction.glb：整机网页模型。\ndata/components.csv：编号、GUID、包络和来源；测点映射模板无实时值。'),('检查与限制','IFC已通过属性和EXPRESS规则校验，并重新读取对比构件世界包络。GLB编号、结构和关键尺寸通过检查。浏览器交互因本机套接字权限限制未完成实测；Revit导入尚未验证。不承诺碰撞、强度、疲劳或制造精度。'),('提高真实精度所需资料','对应机组批次的总装图、机舱平面与剖面、设备BOM、主要部件外形接口图、塔筒/基础设计、叶片几何及测点表。拿到资料后，以相同构件编号替换重建几何。')]:
 y=text(d,75,y,head,30,1900,TEAL)+10;y=text(d,75,y,body,26,1910)+25
pages.append(im)
for i,im in enumerate(pages,1):im.save(ROOT/'preview'/f'图册_{i:02d}.jpg',quality=92)
pages[0].save(ROOT/'V90_BIM重建图册.pdf','PDF',save_all=True,append_images=pages[1:],resolution=127.0,title='V90-2.0MW BIM公开资料重建图册',author='Public-source reconstruction')
print('Atlas saved:',ROOT/'V90_BIM重建图册.pdf')
