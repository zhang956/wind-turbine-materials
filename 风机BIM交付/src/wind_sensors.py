"""Dual acoustic-resonance wind sensor reconstruction; all geometry estimated."""
SOURCE='S05: Vestas 0004-6207 V05 (2010), p17 section 3.6, historical V90 VCS configuration; S06: FT Technologies acoustic resonance principle'
NOTES=('历史V90 VCS规格列出两只带加热FT702LT，分别检测风速与风向。'
       '本构件为声学共振传感器外观示意，不是制造图；尺寸、测量腔外形、安装标高、间距与布线未经原厂确认。'
       '历史配置不能证明S01批次相同；未接入实时数据。')

def build(box,cyl,tube):
    system='09 冷却与安全'
    kw=dict(source=SOURCE,notes=NOTES,evidence='C | estimated geometry')
    # Rear of the cooler envelope, with two separate mounting assemblies.
    for i,y in [(1,.9),(2,-.9)]:
        head='SENSOR.WIND' if i==1 else 'SENSOR.WIND.2'
        mast='SENSOR.MAST' if i==1 else 'SENSOR.MAST.2'
        x=8.9
        box(f'SENSOR.BASE.{i}',f'测风装置{i}安装底板示意',system,(x,y,82.34),(.28,.28,.08),'Steel',**kw)
        tube(mast,f'测风装置{i}支杆示意',system,[(x,y,82.38),(x,y,83.90)],.035,'Steel',**kw)
        tube(f'SENSOR.BRACE.{i}',f'测风装置{i}斜撑示意',system,[(x-.12,y,82.38),(x,y,83.12)],.018,'Steel',**kw)
        cyl(head,f'超声风速风向传感器{i}（FT702LT类型示意）',system,(x,y,83.98),.07,.16,'Blue',**kw)
        cyl(f'{head}.LOWER',f'传感器{i}测量腔下表面示意',system,(x,y,84.065),.085,.025,'Steel',**kw)
        cyl(f'{head}.CAP',f'传感器{i}测量腔顶盖示意',system,(x,y,84.135),.085,.025,'Shell',**kw)
        # Open cavity with three supports; no moving cup/arrow mechanism.
        from math import sin,cos,pi
        for j in range(3):
            a=j*2*pi/3
            cyl(f'{head}.SUPPORT.{j+1}',f'传感器{i}测量腔支柱{j+1}示意',system,
                (x+.066*cos(a),y+.066*sin(a),84.10),.009,.055,'Steel',n=16,**kw)
        box(f'{head}.DATUM',f'传感器{i}方向基准标记示意',system,(x-.071,y,83.98),(.006,.025,.055),'Yellow',bevel=0,**kw)
        tube(f'SENSOR.CABLE.{i}',f'测风装置{i}供电与信号线示意',system,
             [(x+.045,y,83.91),(x+.045,y,82.50),(9.12,y,82.50),(9.12,0,82.50)],.012,'Dark',**kw)
    box('SENSOR.JUNCTION','测风装置接线盒位置示意',system,(9.12,0,82.50),(.22,.28,.18),'Blue',**kw)
