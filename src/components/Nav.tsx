import { Menubar } from 'primereact/menubar';

const Navigation = () => {
    const navlist = [
        {
            label: 'Home', icon: 'pi pi-fw pi-home', command: () => {
                window.location.href = '/';
            }
        },
        {
            label: 'Power meter', icon: 'pi pi-fw pi-calendar', command: () => {
                window.location.href = '/power_meter'
            }
        },
        {
            label: 'Channels', icon: 'pi pi-fw pi-calendar', command: () => {
                window.location.href = '/channels'
            }
        },
    ];

    return (
        <div>
            <header>
                <nav>
                    <Menubar
                        model={navlist}
                    />
                </nav>
            </header>
        </div>
    )
}
export default Navigation;
