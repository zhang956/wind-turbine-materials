"""Public-source V90 reconstruction. Run using Blender 4 background mode."""
import bpy, math, json, csv, sys
from pathlib import Path
from mathutils import Vector, Matrix
from math import sin, cos, pi
ROOT=Path(__file__).resolve().parents[1]
SOURCE='S01: Vestas 2MWfinal.pdf, pp.8-10; platform illustration, not batch-specific CAD'
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for c in list(bpy.data.collections):
    if c.name != 'Collection' and c.users == 0: bpy.data.collections.remove(c)
scene=bpy.context.scene
scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
materials={}
for name,color,metal in [('Shell',(0.82,.86,.89,1),.15),('Steel',(.32,.40,.46,1),.75),('Dark',(.075,.11,.15,1),.5),('Blue',(.035,.23,.39,1),.35),('Copper',(.65,.29,.10,1),.7),('Yellow',(.95,.57,.09,1),.3),('Green',(.05,.45,.36,1),.25),('Concrete',(.42,.46,.48,1),.0),('Red',(.72,.12,.10,1),.2)]:
    mat=bpy.data.materials.new(name);mat.diffuse_color=color;mat.use_nodes=True
    bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=color;bs.inputs['Metallic'].default_value=metal;bs.inputs['Roughness'].default_value=.34
    materials[name]=mat
systems={}
objects=[]

def register(obj,id,name,system,mat='Steel',notes='',evidence='C | estimated geometry',ifc='IfcBuildingElementProxy',source=SOURCE):
    obj.name=id+' | '+name
    if system not in systems:
        col=bpy.data.collections.new(system);scene.collection.children.link(col);systems[system]=col
    for c in list(obj.users_collection):c.objects.unlink(obj)
    systems[system].objects.link(obj)
    obj.data.materials.append(materials[mat])
    props={'AssetId':id,'NameCN':name,'System':system,'Evidence':evidence,'Source':source,'Notes':notes or '公开平台图参考；外形、尺寸、位置及数量为展示重建，未经原厂确认。','IfcClass':ifc,'Reconstruction':True,'DataStatus':'NO_LIVE_DATA'}
    for k,v in props.items():obj[k]=v
    objects.append(obj)
    return obj

def mesh(id,name,sys,vertices,faces,mat='Steel',**kwargs):
    m=bpy.data.meshes.new(id);m.from_pydata(vertices,[],faces);m.update();o=bpy.data.objects.new(id,m);scene.collection.objects.link(o)
    return register(o,id,name,sys,mat,**kwargs)

def box(id,name,sys,loc,size,mat='Steel',bevel=.025,**kwargs):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.scale=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('Edge fillet','BEVEL');mod.width=min(bevel,min(size)/5);mod.segments=2
    return register(o,id,name,sys,mat,**kwargs)

def cyl(id,name,sys,loc,r,depth,mat='Steel',axis='Z',r2=None,n=48,**kwargs):
    bpy.ops.mesh.primitive_cone_add(vertices=n,radius1=r,radius2=r if r2 is None else r2,depth=depth,location=loc)
    o=bpy.context.object
    if axis=='X':o.rotation_euler[1]=pi/2
    elif axis=='Y':o.rotation_euler[0]=pi/2
    for f in o.data.polygons:f.use_smooth=len(f.vertices)==4
    return register(o,id,name,sys,mat,**kwargs)

def ring(id,name,sys,loc,ro,ri,depth,mat='Steel',axis='Z',n=64,**kwargs):
    vs=[]
    for z,r in [(-depth/2,ro),(depth/2,ro),(-depth/2,ri),(depth/2,ri)]:
        for j in range(n):
            v=Vector((r*cos(j*2*pi/n),r*sin(j*2*pi/n),z))
            if axis=='X':v=Matrix.Rotation(pi/2,3,'Y')@v
            if axis=='Y':v=Matrix.Rotation(pi/2,3,'X')@v
            vs.append(tuple(v+Vector(loc)))
    fs=[]
    for j in range(n):
        k=(j+1)%n
        fs += [(j,k,n+k,n+j),(2*n+k,2*n+j,3*n+j,3*n+k),(j,2*n+j,2*n+k,k),(n+k,3*n+k,3*n+j,n+j)]
    return mesh(id,name,sys,vs,fs,mat,**kwargs)

def tube(id,name,sys,points,r=.025,mat='Steel',**kwargs):
    vs=[];fs=[];n=10
    for i,p in enumerate(points):
        tangent=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])
        t=tangent.normalized();u=t.cross(Vector((0,0,1)))
        if u.length<.01:u=t.cross(Vector((0,1,0)))
        u.normalize();v=t.cross(u)
        for j in range(n):vs.append(tuple(Vector(p)+r*(cos(j*2*pi/n)*u+sin(j*2*pi/n)*v)))
    for i in range(len(points)-1):
        for j in range(n):fs.append((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j))
    fs.extend([tuple(range(n-1,-1,-1)),tuple((len(points)-1)*n+j for j in range(n))])
    return mesh(id,name,sys,vs,fs,mat,**kwargs)

def bolts(id,name,sys,center,r,count,axis='X',bolt_r=.04,mat='Steel'):
    # One identifiable bolt set, not an assertion of actual bolt specification/count.
    vs=[];fs=[]
    transform=Matrix.Rotation(pi/2,3,'Y') if axis=='X' else Matrix.Identity(3)
    for k in range(count):
        a=k*2*pi/count;c=Vector((r*cos(a),r*sin(a),0));base=len(vs)
        for z in [-.035,.035]:
            for j in range(6):vs.append(tuple(Vector(center)+transform@(c+Vector((bolt_r*cos(j*pi/3),bolt_r*sin(j*pi/3),z)))))
        fs.append(tuple(base+j for j in range(5,-1,-1)));fs.append(tuple(base+6+j for j in range(6)))
        for j in range(6):fs.append((base+j,base+(j+1)%6,base+6+(j+1)%6,base+6+j))
    return mesh(id,name,sys,vs,fs,mat,notes='螺栓组为外观示意；数量、直径、预紧及孔距未获原厂资料。')

# Foundation is explicitly a separate illustrative site element.
cyl('SITE.FOUNDATION','基础示意（场址未定）','01 基础与塔筒',(0,0,-1.1),8.0,2.2,'Concrete',n=64,notes='场址未定；16m直径/2.2m厚度仅示意，非该机型基础设计。',ifc='IfcFooting')
cyl('SITE.PEDESTAL','基础承台示意','01 基础与塔筒',(0,0,.3),2.5,.6,'Concrete',ifc='IfcFooting')
# Hollow tapered tower, 3 visual sections, wall thickness schematic.
for i,(z0,z1) in enumerate([(0,26.1),(26.1,52.2),(52.2,78.3)],1):
    n=80;vs=[];fs=[]
    r0=2.15-.9*z0/78.3;r1=2.15-.9*z1/78.3
    for z,r in [(z0,r0),(z1,r1),(z0,r0-.045),(z1,r1-.045)]:
        vs += [(r*cos(j*2*pi/n),r*sin(j*2*pi/n),z) for j in range(n)]
    for j in range(n):
        k=(j+1)%n;fs +=[(j,k,n+k,n+j),(2*n+k,2*n+j,3*n+j,3*n+k),(j,2*n+j,2*n+k,k),(n+k,3*n+k,3*n+j,n+j)]
    mesh(f'TOWER.SECTION.{i}',f'塔筒第{i}段','01 基础与塔筒',vs,fs,'Shell',notes='轮毂高度80m来自S01第10页；塔顶78.3m、分段、直径、壁厚均为估算。',ifc='IfcColumn')
    ring(f'TOWER.FLANGE.{i}',f'塔筒法兰{i}','01 基础与塔筒',(0,0,z0+.09),r0,r0-.18,.18)
    bolts(f'TOWER.BOLTS.{i}',f'塔筒连接螺栓组{i}','01 基础与塔筒',(0,0,z0+.19),r0-.09,48,'Z')

# Source-aware tower internals, all world coordinates in metres.
sys.path.insert(0,str(Path(__file__).resolve().parent))
import tower_internals
tower_internals.build(box,cyl,ring,bolts,mesh,tube,objects)
# Yaw and bedplate.
ring('YAW.BEARING','偏航轴承','03 偏航系统',(0,0,78.32),1.47,1.13,.30,'Steel')
ring('YAW.GEAR','偏航齿圈示意','03 偏航系统',(0,0,78.5),1.48,1.30,.12,'Dark')
bolts('YAW.BOLTS','偏航连接螺栓组','03 偏航系统',(0,0,78.52),1.37,48,'Z')
for i in range(6):
    a=2*pi*i/6;x,y=1.1*cos(a),1.1*sin(a)
    cyl(f'YAW.MOTOR.{i+1}',f'偏航驱动电机{i+1}','03 偏航系统',(x,y,78.95),.15,.65,'Blue',n=24,ifc='IfcElectricMotor')
    cyl(f'YAW.REDUCER.{i+1}',f'偏航减速器{i+1}','03 偏航系统',(x,y,78.6),.23,.28,'Steel',n=24)
box('FRAME.BASE','机舱承载底架','04 机舱结构',(3.6,0,78.65),(10.0,2.75,.35),'Steel',notes='单体铸造底座概念见S01第4页；当前几何为布局重建，无受力/疲劳计算。')
for y in [-1.05,1.05]:box(f'FRAME.RAIL.{y}','纵向支承梁','04 机舱结构',(3.5,y,79.0),(9.5,.23,.4),'Dark')
# Nacelle shell envelope: x -1.6..8.8; y +-1.75; z78.3..82.3; CoolerTop max83.7.
box('COVER.FLOOR','机舱底部壳体','05 机舱外罩',(3.6,0,78.39),(10.4,3.5,.18),'Shell',notes='整体外罩包络长10.4m/宽3.5m/运输高4m为S01第10页参数；曲面分割与细节为重建。')
for y,tag in [(-1.69,'PORT'),(1.69,'STARBOARD')]:
    box('COVER.SIDE.'+tag,'机舱侧罩','05 机舱外罩',(3.6,y,80.27),(10.4,.12,3.76),'Shell',bevel=.06)
box('COVER.ROOF','可隐藏机舱顶罩','05 机舱外罩',(3.6,0,82.22),(10.4,3.5,.16),'Shell',bevel=.05)
box('COVER.REAR','机舱后罩','05 机舱外罩',(8.72,0,80.3),(.16,3.5,3.7),'Shell')
box('COVER.FRONT','机舱前部下罩','05 机舱外罩',(-1.52,0,79.1),(.16,3.5,1.4),'Shell')
# Main shaft along X, root / hub at X=-3.5, hub-height=80.
cyl('DRIVE.SHAFT','低速主轴','06 传动链',(-.55,0,80),.32,3.7,'Steel',axis='X')
cyl('DRIVE.ROTOR.FLANGE','轮毂主轴连接法兰','06 传动链',(-2.35,0,80),.68,.18,'Steel',axis='X')
bolts('DRIVE.ROTOR.BOLTS','轮毂主轴螺栓组','06 传动链',(-2.45,0,80),.55,24)
box('DRIVE.BEARING.SEAT','主轴承座','06 传动链',(-.05,0,79.7),(1.1,1.75,1.2),'Blue',bevel=.15)
ring('DRIVE.BEARING','主轴承外观','06 传动链',(-.08,0,80),.65,.33,.8,'Steel',axis='X')
bolts('DRIVE.BEARING.BOLTS','主轴承座端盖螺栓组','06 传动链',(-.51,0,80),.55,18)
# Gearbox casing is exterior, no invented gear counts/ratios.
cyl('GEARBOX.STAGE.1','齿轮箱一级壳体','06 传动链',(1.65,0,80),.91,.9,'Blue',axis='X',notes='箱体几何为S01平台外形重建；内部功能模块采用S05历史50Hz VCS一级行星+两级斜齿，版本差异未消除，非同批次精确装配。')
cyl('GEARBOX.STAGE.2','齿轮箱二级壳体','06 传动链',(2.48,0,80),.74,.76,'Blue',axis='X')
box('GEARBOX.HIGH','齿轮箱高速级壳体','06 传动链',(3.12,0,80.10),(.70,1.18,1.45),'Blue',bevel=.16)
for i,(x,r) in enumerate([(1.19,.93),(2.1,.78),(2.87,.67)]):
    ring(f'GEARBOX.FLANGE.{i}','齿轮箱壳体法兰','06 传动链',(x,0,80),r,r-.11,.10,'Steel',axis='X')
    bolts(f'GEARBOX.BOLTS.{i}','齿轮箱端盖螺栓组','06 传动链',(x-.06,0,80),r-.055,24)
for y in [-.8,.8]:
    box(f'GEARBOX.TORQUE.{y}','齿轮箱扭力臂','06 传动链',(2,y,79.45),(.5,.9,.34),'Steel')
    cyl(f'GEARBOX.BUSH.{y}','扭力臂支承示意','06 传动链',(2,y*1.4,79.4),.22,.35,'Dark',axis='X')
cyl('DRIVE.HIGH.SHAFT','高速轴','06 传动链',(3.95,0,80.22),.10,1.05,'Steel',axis='X')
ring('DRIVE.BRAKE.DISC','高速轴制动盘','06 传动链',(3.65,0,80.22),.37,.105,.06,'Steel',axis='X')
box('DRIVE.BRAKE.CALIPER','制动钳示意','06 传动链',(3.65,.31,80.22),(.24,.19,.4),'Yellow')
for x in [4.15,4.33]:ring(f'DRIVE.COUPLING.{x}','弹性联轴器盘','06 传动链',(x,0,80.22),.29,.105,.07,'Dark',axis='X')
# DFIG exterior + rear slip-ring compartment separated.
cyl('GENERATOR.BODY','双馈异步发电机机体','07 发电与电气',(5.72,0,80.22),.66,2.28,'Blue',axis='X',ifc='IfcElectricGenerator',notes='双馈发电机及滑环类型由S01第10页确认；具体供应商、尺寸、绕组、滑环数量均未知。')
for i,x in enumerate([4.62,6.80]):
    cyl(f'GENERATOR.END.{i}','发电机端盖','07 发电与电气',(x,0,80.22),.70,.12,'Steel',axis='X')
    bolts(f'GENERATOR.BOLTS.{i}','发电机端盖螺栓组','07 发电与电气',(x+.075,0,80.22),.59,20)
for i in range(14):
    a=2*pi*i/14
    o=box(f'GENERATOR.FIN.{i}','发电机外部散热筋示意','07 发电与电气',(5.72,.67*cos(a),80.22+.67*sin(a)),(1.95,.055,.12),'Blue',bevel=.01);o.rotation_euler[0]=a-pi/2
for x in [4.9,6.5]:
    for y in [-.49,.49]:box(f'GENERATOR.FOOT.{x}.{y}','发电机支脚','07 发电与电气',(x,y,79.43),(.38,.32,.42),'Steel')
box('GENERATOR.TERMINAL','发电机接线盒','07 发电与电气',(5.8,-.75,80.32),(.68,.35,.52),'Blue')
cyl('GENERATOR.SLIPRING','滑环舱外罩','07 发电与电气',(7.17,0,80.22),.44,.57,'Dark',axis='X',notes='滑环存在由官方确认；只建立外罩包络，内部滑环/电刷待厂家图纸。')
box('ELEC.CABINET.1','电控柜包络示意','07 发电与电气',(7.75,.75,80.02),(.75,.8,1.65),'Shell',ifc='IfcElectricDistributionBoard')
box('ELEC.CABINET.2','变流设备包络待核实','07 发电与电气',(6.1,1.20,79.79),(1.65,.48,1.2),'Shell',ifc='IfcElectricDistributionBoard',notes='双馈系统需要变流器；当前柜体位置、数量与内部布局没有具体批次证据，为待核实包络。')
for i in range(3):tube(f'ELEC.CABLE.{i}','机舱电缆桥接示意','07 发电与电气',[(5.8,-.92,80.2+i*.055),(5.8,-1.2,79.25),(1,-1.2,79.25),(.6,.6,78)],.025,'Dark')
# Cooling, lubrication and hydraulic packs.
box('LUBE.TANK','齿轮箱润滑油箱示意','08 润滑与液压',(2.45,-1.15,79.38),(1.15,.55,.5),'Green')
cyl('LUBE.FILTER','润滑过滤器','08 润滑与液压',(2.85,-1.2,79.92),.12,.5,'Shell')
cyl('LUBE.PUMP','润滑泵组','08 润滑与液压',(1.9,-1.2,79.85),.13,.4,'Blue',axis='X')
box('HYDRAULIC.PACK','液压动力单元示意','08 润滑与液压',(.65,-1.1,79.36),(.78,.55,.5),'Green')
for i in range(2):cyl(f'HYDRAULIC.ACC.{i}','液压蓄能器示意','08 润滑与液压',(.4+i*.35,-1.13,79.95),.10,.60,'Dark')
tube('LUBE.PIPE','润滑回路示意','08 润滑与液压',[(2,-1.2,79.85),(1.65,-1.0,80.1),(1.65,-.7,80.5)],.035,'Copper')
for i,y in enumerate([-.22,.22]):tube(f'COOL.PIPE.{i}','顶部冷却管路示意','09 冷却与安全',[(5.2,y,80.8),(5.2,y,81.3),(7.5,y,81.3),(7.5,y,82.7)],.055,'Steel')
# cooler sits outside nacelle roof; 5.4m total installation envelope.
box('COOL.FRAME','CoolerTop顶部冷却器框架','09 冷却与安全',(7.12,0,83.05),(2.75,3.2,1.3),'Steel',notes='CoolerTop类型及安装包络高5.4m由S01确认；换热器管排与支架几何为重建。')
box('COOL.RADIATOR','顶部换热面','09 冷却与安全',(7.12,-1.62,83.05),(2.45,.06,1.10),'Dark')
for i in range(22):box(f'COOL.FIN.{i}','换热面栅格示意','09 冷却与安全',(5.96+i*.11,-1.66,83.05),(.025,.03,1.06),'Steel',bevel=0)
for x in [5.9,8.3]:box(f'COOL.SUPPORT.{x}','冷却器支架','09 冷却与安全',(x,0,82.52),(.10,2.4,.45),'Steel')
import wind_sensors
wind_sensors.build(box,cyl,tube)
cyl('SAFETY.BEACON','航空警示灯','09 冷却与安全',(8.15,-.9,83.1),.17,.24,'Red')
cyl('SAFETY.FIRE','消防设备位置示意','09 冷却与安全',(7.9,-1.2,79.6),.11,.64,'Red')
# service aisle, handrail and crane outside drive-line envelope.
box('SERVICE.WALK','机舱检修通道','10 检修设施',(3.5,-1.2,79.08),(8.9,.65,.06),'Steel')
for x in [-.8,2.3,5.4,7.8]:tube(f'SERVICE.POST.{x}','检修护栏立柱','10 检修设施',[(x,-1.52,79.1),(x,-1.52,80.1)],.025,'Yellow')
tube('SERVICE.RAIL','检修护栏','10 检修设施',[(-.8,-1.52,80.1),(7.8,-1.52,80.1)],.025,'Yellow')
box('SERVICE.CRANE.BEAM','检修吊装梁示意','10 检修设施',(4.7,1.23,81.72),(5.9,.17,.22),'Yellow')
box('SERVICE.HOIST','检修葫芦示意','10 检修设施',(5.1,1.23,81.4),(.4,.32,.38),'Yellow')
tube('SERVICE.CHAIN','吊钩链条示意','10 检修设施',[(5.1,1.23,81.2),(5.1,1.23,80.6)],.018,'Dark')
# Hub ellipsoid, removable spinner. Blade geometry is synthetic sections, never named manufacturer airfoil.
bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=24,location=(-3.5,0,80));hub=bpy.context.object;hub.scale=(1.65,1.35,1.35)
register(hub,'ROTOR.HUB','轮毂主体重建','11 轮毂与变桨','Steel',notes='轮毂最大运输包络见S01；实际铸件尺寸及叶根偏置未知，本模型采用简化包络。')
bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=24,location=(-4.22,0,80));spinner=bpy.context.object;spinner.scale=(1.5,1.4,1.4)
register(spinner,'ROTOR.SPINNER','轮毂导流罩','05 机舱外罩','Shell')
for b in range(3):
    angle=b*2*pi/3;rot=Matrix.Rotation(angle,3,'X');origin=Vector((-3.5,0,80))
    def rp(p):return tuple(origin+rot@Vector(p))
    o=ring(f'PITCH.BEARING.{b+1}',f'叶片{b+1}变桨轴承','11 轮毂与变桨',(0,0,0),.79,.62,.22,'Steel')
    for v in o.data.vertices:v.co=origin+rot@(v.co+Vector((0,0,1.22)))
    o=bolts(f'PITCH.BOLTS.{b+1}',f'叶根螺栓组{b+1}','11 轮毂与变桨',(0,0,1.36),.71,36,'Z')
    for v in o.data.vertices:v.co=origin+rot@v.co
    tube(f'PITCH.CYLINDER.{b+1}',f'变桨液压缸{b+1}','11 轮毂与变桨',[rp((.3,.25,.35)),rp((.4,.36,1.1))],.12,'Blue',notes='官方说明3液压缸全顺桨制动；液压缸行程、铰点和尺寸为示意。')
    tube(f'PITCH.ROD.{b+1}',f'变桨活塞杆{b+1}','11 轮毂与变桨',[rp((.4,.36,1.05)),rp((.43,.44,1.47))],.055,'Steel')
    # radial start=1, tip=45 -> 44m length and 90m rotor diameter. Built in shaft coordinates; 6-degree tilt applied below, no precone modeled.
    stations=[(0,1.38,.98,0),(1,1.45,.70,13),(3,2.6,.36,12),(6,3.9,.24,10),(10,3.55,.21,8),(16,2.95,.18,6),(23,2.3,.16,4),(30,1.65,.14,2),(37,1.05,.12,1),(42,.55,.10,0),(44,.08,.08,0)]
    vs=[];fs=[];n=48
    for span,chord,thick,twist in stations:
        for j in range(n):
            a=2*pi*j/n
            if span==0:xx=.69*cos(a);yy=.69*sin(a)
            else:
                u=(1-cos(a))/2
                t=5*thick*(.2969*math.sqrt(u)-.126*u-.3516*u*u+.2843*u**3-.1036*u**4)
                xx=chord*t*(1 if j<n/2 else -1);yy=chord*(u-.35)
                tw=math.radians(twist);xx,yy=xx*cos(tw)-yy*sin(tw),xx*sin(tw)+yy*cos(tw)
            vs.append(rp((xx,yy,span+1)))
    for k in range(len(stations)-1):
        for j in range(n):fs.append((k*n+j,k*n+(j+1)%n,(k+1)*n+(j+1)%n,(k+1)*n+j))
    fs.extend([tuple(range(n-1,-1,-1)),tuple((len(stations)-1)*n+j for j in range(n))])
    ob=mesh(f'ROTOR.BLADE.{b+1}',f'叶片{b+1} / 44m','12 风轮叶片',vs,fs,'Shell',evidence='A dimensions / C surface',notes='44m长度、3.9m最大弦长及90m风轮来自S01第10页；合成翼型、扭角、预弯、根部偏置均非原厂气动设计；整体轴倾角另按S05设置。')
    for p in ob.data.polygons:p.use_smooth=True

import electrical_yaw
electrical_yaw.build(box,cyl,ring,tube,objects)

import drivetrain_internals
drivetrain_internals.build(box,cyl,ring,tube)

# R10: preserve the 80 m hub centre; positive Y tilt makes the front (-X) higher.
# Only the shaft tilt is source-backed. Upper support/housing placement remains C-grade.
bpy.context.view_layer.update()
tilt_origin=Vector((-3.5,0,80))
tilt_matrix=Matrix.Translation(tilt_origin) @ Matrix.Rotation(math.radians(6),4,'Y') @ Matrix.Translation(-tilt_origin)
for ob in objects:
    if ob['System'][:2] not in ('01','02','03'):
        ob.matrix_world=tilt_matrix @ ob.matrix_world
        ob['Notes']+=' R10：绕轮毂中心应用6度主轴倾角（S05第5页）；支承/外罩配合为C级布局假设，非原厂安装图。'
        ob['Source']+='; S05 p5 rotor tilt 6 deg'

# Metadata / geometry export from evaluated meshes. Normals fixed outward where possible.
for ob in objects:
    if ob.type=='MESH':
        bpy.context.view_layer.objects.active=ob
        ob.select_set(True)
        # bmesh recalc works without entering edit mode
        import bmesh
        bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(ob.data);bm.free();ob.select_set(False)
bpy.context.view_layer.update()
components=[];deps=bpy.context.evaluated_depsgraph_get()
for ob in objects:
    eo=ob.evaluated_get(deps);m=eo.to_mesh();m.calc_loop_triangles()
    vs=[tuple(round(v,6) for v in ob.matrix_world@vtx.co) for vtx in m.vertices]
    fs=[tuple(t.vertices) for t in m.loop_triangles]
    mn=[min(v[k] for v in vs) for k in range(3)];mx=[max(v[k] for v in vs) for k in range(3)]
    components.append({'id':ob['AssetId'],'name':ob['NameCN'],'system':ob['System'],'ifc_class':ob['IfcClass'],'evidence':ob['Evidence'],'source':ob['Source'],'notes':ob['Notes'],'vertices':vs,'faces':fs,'color':list(ob.data.materials[0].diffuse_color),'bbox_min':mn,'bbox_max':mx,'dimensions':[round(mx[k]-mn[k],6) for k in range(3)]})
    eo.to_mesh_clear()
project={'name':'Vestas V90-2.0 MW / public-source reconstruction','description':'非原厂CAD；官方外部参数约束、平台图参考、内部估算几何；无实时数据。','units':'m','hub_height_m':80,'rotor_diameter_m':90,'rated_power_kw':2000,'source_url':'https://www.vestas.cn/content/dam/vestas-com/cn/product-/2MWfinal.pdf','model_revision':'R10','shaft_tilt_deg':6,'coordinate_system':'Z up; hub (-3.5,0,80); shaft rearward (cos6,0,-sin6); no georeference'}
(ROOT/'data/mesh_exchange.json').write_text(json.dumps({'project':project,'components':components},ensure_ascii=False,separators=(',',':')))
metadata=[{k:v for k,v in p.items() if k not in ('vertices','faces')} for p in components]
(ROOT/'data/components.json').write_text(json.dumps({'project':project,'components':metadata},ensure_ascii=False,indent=2))
with (ROOT/'data/components.csv').open('w',encoding='utf-8-sig',newline='') as f:
    fields=['id','name','system','ifc_class','evidence','source','notes','dimensions']
    w=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore');w.writeheader();w.writerows(metadata)
# Export original placements; no render camera/light objects in the asset files.
bpy.ops.object.select_all(action='DESELECT')
for ob in objects:ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'models/V90_reconstruction.glb'),use_selection=True,export_format='GLB',export_extras=True,export_apply=True)
bpy.ops.object.select_all(action='DESELECT')
for ob in objects:
    if ob['System'] not in ['01 基础与塔筒','02 塔内设施','12 风轮叶片'] and ob['AssetId']!='ELEC.TRANSFORMER':ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'models/V90_nacelle.glb'),use_selection=True,export_format='GLB',export_extras=True,export_apply=True)
bpy.ops.object.select_all(action='DESELECT')
# Render setup: CPU Cycles, deterministic, no external network/assets.
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=48;scene.cycles.use_denoising=False
scene.render.resolution_x=1600;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.world.color=(.24,.24,.24)
scene.view_settings.view_transform='AgX'
world=scene.world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.14,.18,.23,1);world.node_tree.nodes['Background'].inputs[1].default_value=.55
bpy.ops.object.light_add(type='SUN',location=(0,-30,100));sun=bpy.context.object;sun.name='Render sunlight';sun.rotation_euler=(.4,-.5,-.6);sun.data.energy=2.7;sun.data.angle=.15
for loc,power,size in [((1,-10,89),2500,12),((8,9,88),3500,10),((-8,2,85),2000,8)]:
    bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((3,0,80))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;cam.name='Inspection camera';cam.data.type='ORTHO';scene.camera=cam

def camera(loc,target,scale):
    cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;cam.data.clip_end=1000

def render(name,loc,target,scale):
    camera(loc,target,scale);scene.render.filepath=str(ROOT/'preview'/name);bpy.ops.render.render(write_still=True)

# User opens Blender in the useful nacelle open view. Whole assets remain available.
for ob in objects:
    ob.hide_render=ob['AssetId'].startswith('COVER.') or ob['AssetId']=='ROTOR.SPINNER'
    ob.hide_set(ob.hide_render)
camera((-13,-19,94),(2,0,80.2),18)
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.region_3d.view_distance=20;area.spaces.active.region_3d.view_location=(2,0,80);area.spaces.active.clip_end=1000
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'models/V90_reconstruction.blend'))
if '--no-render' not in sys.argv:
    # crop blades, tower and foundation from machinery inspections
    for ob in objects:
        if ob['System'] in ['01 基础与塔筒','02 塔内设施','12 风轮叶片'] or ob['AssetId']=='ELEC.TRANSFORMER':ob.hide_render=True
    render('02_机舱开放.png',(-12,-17,94),(2,0,80.5),17)
    render('03_传动链侧视.png',(3,-28,83),(2.2,0,80.4),16)
    for ob in objects:
        ob.hide_render=ob['AssetId'].startswith('COVER.') or ob['AssetId']=='ROTOR.SPINNER'
        if ob['System']=='12 风轮叶片' or ob['System'] in ['01 基础与塔筒','02 塔内设施'] or ob['AssetId']=='ELEC.TRANSFORMER':ob.hide_render=True
    positions={ob:ob.location.copy() for ob in objects}
    offsets={'06 传动链':Vector((0,0,1.7)),'07 发电与电气':Vector((1.7,0,3.2)),'09 冷却与安全':Vector((0,0,4.5)),'11 轮毂与变桨':Vector((-2,0,0)),'10 检修设施':Vector((0,-2,0))}
    for ob in objects:
        if ob['System'] in offsets:ob.location+=offsets[ob['System']]
    render('04_系统分解示意.png',(-15,-22,97),(2,0,82),23)
    for ob,loc in positions.items():ob.location=loc
    for ob in objects:ob.hide_render=False
    render('01_整机.png',(-170,-210,135),(0,0,62),210)
print('MODEL_COMPLETE',len(components),'components',sum(len(p['faces']) for p in components),'triangles')
