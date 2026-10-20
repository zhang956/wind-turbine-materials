"""R03 functional reconstruction; dimensions and routing are not OEM drawings."""
import bpy
from math import pi, sin, cos
S03='https://media.mwps.world/static/2020/10/vestas-v90-20-brochure.pdf | Vestas-authored historic brochure, third-party mirror, pp7-9'
S04='https://www.mathworks.com/help/simscape-electrical/ug/doubly-fed-inductor-generator-wind-power-system.html | generic DFIG topology, not OEM layout'
NOTE='功能展示重建；尺寸、位置、数量及接线走向未经原厂图纸确认，统一米制；不是制造图或电气施工图。'

def build(box,cyl,ring,tube,objects):
    def drop(id):
        ob=next((o for o in objects if o['AssetId']==id),None)
        if ob:objects.remove(ob);bpy.data.objects.remove(ob,do_unlink=True)
    def wrap(fn,source):
        def call(*a,**kw):
            kw.setdefault('source',source);kw.setdefault('notes',NOTE);kw.setdefault('evidence','C | functional reconstruction');return fn(*a,**kw)
        return call
    B,C,R,T=[wrap(f,S04) for f in (box,cyl,ring,tube)]
    Y='03 偏航系统';E='07 发电与电气';I='02 塔内设施'
    # Existing six drives retained; exact gear module and tooth counts unknown.
    for ob in objects:
        if ob['AssetId'].startswith(('YAW.MOTOR.','YAW.REDUCER.')):
            ob['Source']=S03;ob['Evidence']='B historical six-drive configuration / C geometry';ob['Notes']=NOTE+' S03六驱动配置；不代表所有批次。'
    for i in range(6):
        a=2*pi*i/6;x,y=1.1*cos(a),1.1*sin(a)
        C(f'YAW.PINION.{i+1}','偏航输出小齿轮包络',Y,(x,y,78.47),.20,.12,'Steel',source=S03,notes=NOTE+' 不虚构齿数与模数，光滑包络表示齿轮位置。')
        C(f'YAW.MOTOR.BRAKE.{i+1}','偏航驱动制动器（构造示意）',Y,(x,y,79.31),.16,.10,'Dark',source=S03)
        B(f'YAW.BRAKE.PAD.{i+1}','偏航摩擦制动组件（待批次核实）',Y,(1.47*cos(a+.3),1.47*sin(a+.3),78.25),(.18,.18,.18),'Yellow',source=S03)
    B('YAW.LUBE.PUMP','偏航集中润滑单元',Y,(-.65,.65,79.35),(.3,.3,.35),'Green',source=S03,evidence='B lubrication function / C geometry')
    T('YAW.LUBE.LINE','偏航润滑环路示意',Y,[(1.2*cos(j*2*pi/36),1.2*sin(j*2*pi/36),78.72) for j in range(37)],.012,'Green',source=S03)
    B('YAW.POSITION.SENSOR','偏航位置/解缆检测示意',Y,(.8,-.8,78.75),(.12,.12,.16),'Red',source=S03)
    # Cabinet envelopes replaced with exposed internals and independently hideable housing.
    drop('ELEC.CABINET.1');drop('ELEC.CABINET.2')
    B('ELEC.CABINET.1','机舱控制柜（位置重建）',E,(4.55,1.30,80.15),(.60,.45,1.55),'Shell',ifc='IfcElectricDistributionBoard')
    B('ELEC.CABINET.2','变流柜安装背板',E,(6.10,1.48,80.0),(1.65,.06,1.55),'Steel',ifc='IfcElectricDistributionBoard',source=S03)
    B('ELEC.HOUSING.CONVERTER','变流柜外罩（可隐藏）',E,(6.10,1.17,80.0),(1.72,.60,1.6),'Shell',source=S03)
    for k,x in [('RSC',5.61),('GSC',6.57)]:
        B(f'ELEC.CONVERTER.{k}',('转子侧' if k=='RSC' else '网侧')+'功率模块组',E,(x,1.22,80.20),(.43,.30,.56),'Blue')
        B(f'ELEC.CONVERTER.{k}.COOLING','功率模块冷却板',E,(x,1.40,80.20),(.46,.035,.60),'Steel')
        for j in range(3):B(f'ELEC.CONVERTER.{k}.TERMINAL.{j}','功率模块端子示意',E,(x-.13+j*.13,1.02,80.2),(.06,.08,.12),'Copper')
    for j in range(4):
        C(f'ELEC.DCLINK.CAP.{j+1}','直流母线电容（短时缓冲，非储能电池）',E,(5.85+j*.17,1.20,79.60),.065,.30,'Dark',notes=NOTE+' 通用DFIG直流母线；4只为展示数量，不代表实际容量或配置。')
    for j,z in enumerate([79.81,79.88]):B(f'ELEC.DCLINK.BUS.{j}','直流正/负母排示意',E,(6.1,1.03,z),(1.35,.025,.035),'Copper')
    B('ELEC.FILTER.CORE','网侧滤波电抗器铁芯示意',E,(6.55,1.20,79.49),(.40,.30,.30),'Steel')
    for j in range(3):R(f'ELEC.FILTER.COIL.{j}','滤波电抗器绕组示意',E,(6.42+j*.13,1.18,79.49),.095,.048,.19,'Copper')
    B('ELEC.PROTECTION.BREAKER','发电回路断路器示意',E,(5.30,1.17,80.05),(.18,.32,.60),'Dark')
    B('ELEC.PROTECTION.RELAY','电气保护与测量单元',E,(6.1,1.12,80.54),(.35,.18,.22),'Green')
    # Transformer in rear nacelle (S03 type/location); all internals are illustrative.
    B('ELEC.TRANSFORMER.BASE','机舱升压变压器底座',E,(8.02,0,79.13),(1.22,2.65,.16),'Steel',source=S03)
    B('ELEC.HOUSING.TRANSFORMER','变压器防护隔间（可隐藏）',E,(8.02,0,80.25),(1.25,2.70,2.25),'Shell',source=S03)
    for z in [79.38,80.90]:B(f'ELEC.TRANSFORMER.YOKE.{z}','变压器铁轭（示意）',E,(8.02,0,z),(.45,2.25,.22),'Steel',source=S03)
    for j,y in enumerate([-.78,0,.78]):
        B(f'ELEC.TRANSFORMER.CORE.{j}','变压器铁芯柱示意',E,(8.02,y,80.14),(.30,.30,1.35),'Steel',source=S03,ifc='IfcTransformer')
        R(f'ELEC.TRANSFORMER.LV.{j}','变压器低压绕组示意',E,(8.02,y,80.14),.28,.22,1.10,'Copper',source=S03)
        R(f'ELEC.TRANSFORMER.HV.{j}','变压器高压绕组示意',E,(8.02,y,80.14),.35,.30,1.10,'Red',source=S03,notes=NOTE+' 示意同心绕组；真实绝缘、匝数、联结组别及电压比待厂家资料。')
        C(f'ELEC.TRANSFORMER.TERMINAL.{j}','变压器出线绝缘端子',E,(8.02,y,81.25),.075,.36,'Shell',source=S03)
    # Branches show topology, not cable schedules or electrical clearance design.
    T('ELEC.PATH.STATOR','定子输出至保护开关',E,[(5.8,-.95,80.32),(5.15,-1.15,80.32),(5.15,-1.15,81.25),(5.15,1.15,81.25),(5.3,1.17,80.35)],.025,'Yellow')
    T('ELEC.PATH.ROTOR','转子滑环至转子侧变流器（双向）',E,[(7.17,0,80.45),(7.17,1.05,81.35),(5.61,1.05,81.35),(5.61,1.05,80.45)],.022,'Blue')
    T('ELEC.PATH.LV','低压交流汇流至升压变压器',E,[(5.3,1.17,80.35),(5.3,1.65,81.55),(7.65,1.65,81.55),(7.65,0,81.55),(7.8,0,80.75)],.032,'Yellow')
    T('ELEC.PATH.GSC','网侧变流器经滤波接交流汇流（双向）',E,[(6.57,1.05,80.45),(6.92,1.05,80.45),(6.92,1.05,79.45),(6.70,1.05,79.45),(6.70,1.65,81.55)],.022,'Blue')
    T('ELEC.PATH.HV','变压器中压出线至塔顶',E,[(8.02,-.78,81.43),(8.5,-1.5,81.43),(8.5,-1.5,79.1),(.58,-1.5,79.1),(.58,.24,78.6)],.035,'Red')
    B('ELEC.MV.SWITCHGEAR','塔底中压开关柜（选配，位置示意）',I,(1.1,-.05,1.52),(.62,.65,1.65),'Shell',source=S03,ifc='IfcElectricDistributionBoard',notes=NOTE+' S03第9页列为选配；本展示选择配备，不能当作全机型标配。')
    B('ELEC.MV.PANEL','开关柜操作及保护面板',I,(1.1,-.39,1.65),(.48,.025,.65),'Blue',source=S03)
    T('ELEC.PATH.TOWER.END','塔底中压电缆至开关柜',I,[(.58,.24,.8),(.58,-.05,.8),(1.1,-.05,.8)],.035,'Red')
    T('ELEC.PATH.COLLECTOR','集电线路接口（场站外部延伸示意）',I,[(1.1,-.05,.8),(1.1,-.05,.4),(1.1,-1.6,.4)],.035,'Red',notes=NOTE+' 模型边界为集电线路接口；风场升压站未建模，电压等级待场站设计。')
    for ob in objects:
        if ob['AssetId'].startswith('TOWER.POWER.CABLE.'):
            ob['NameCN']='塔内中压出线电缆（机舱变压器方案）';ob['Notes']=NOTE+' 接机舱变压器至塔底选配开关柜；根数、截面与电压等级未确认。'
